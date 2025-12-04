import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for user context (5 min TTL)
const userContextCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Enhanced user context with more data
async function getUserContext(supabase: any, userId: string) {
  const cached = userContextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Fetch comprehensive user context in parallel
    const [
      profileResult, 
      rolesResult, 
      todayVisitsResult,
      todayBeatResult,
      pendingPaymentsResult,
      recentOrdersResult,
      territoryResult
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, username').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('visits').select('id, status, retailers(name)').eq('user_id', userId)
        .gte('planned_date', today).lte('planned_date', today),
      supabase.from('beat_plans').select('beat_name, beat_data').eq('user_id', userId)
        .eq('plan_date', today).maybeSingle(),
      supabase.from('orders').select('id, retailer_id, total_amount, payment_status')
        .eq('user_id', userId).neq('payment_status', 'paid').limit(5),
      supabase.from('orders').select('id, total_amount, created_at')
        .eq('user_id', userId).gte('order_date', weekAgo).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_territories').select('territory:territories(name)').eq('user_id', userId).limit(1)
    ]);

    const isAdmin = rolesResult.data?.some((r: any) => r.role === 'admin') || false;
    
    // Calculate business context
    const now = new Date();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const isMonthEnd = dayOfMonth >= 25;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';

    const totalPending = pendingPaymentsResult.data?.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0) || 0;
    const recentSales = recentOrdersResult.data?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;

    const context = {
      profile: profileResult.data || { full_name: 'User', username: 'user' },
      isAdmin,
      userRole: isAdmin ? 'Manager/Admin' : 'Field Sales User',
      todayVisits: todayVisitsResult.data || [],
      todayBeat: todayBeatResult.data?.beat_name || null,
      territory: territoryResult.data?.[0]?.territory?.name || null,
      pendingCollections: {
        count: pendingPaymentsResult.data?.length || 0,
        total: totalPending,
        topRetailers: pendingPaymentsResult.data?.slice(0, 3) || []
      },
      recentPerformance: {
        orderCount: recentOrdersResult.data?.length || 0,
        totalSales: recentSales
      },
      businessContext: {
        timeOfDay,
        isMonthEnd,
        isWeekend,
        dayOfMonth
      }
    };

    userContextCache.set(userId, { data: context, timestamp: Date.now() });
    return context;
  } catch (error) {
    console.error('Error fetching user context:', error);
    // Return default context on error
    return {
      profile: { full_name: 'User', username: 'user' },
      isAdmin: false,
      userRole: 'Field Sales User',
      todayVisits: [],
      todayBeat: null,
      territory: null,
      pendingCollections: { count: 0, total: 0, topRetailers: [] },
      recentPerformance: { orderCount: 0, totalSales: 0 },
      businessContext: {
        timeOfDay: 'morning',
        isMonthEnd: false,
        isWeekend: false,
        dayOfMonth: new Date().getDate()
      }
    };
  }
}

// Query classification for routing
function classifyQuery(message: string): { category: string; priority: string; suggestedTools: string[] } {
  const lower = message.toLowerCase();
  
  // High priority - urgent business queries
  if (/overdue|urgent|critical|immediately|asap/i.test(lower)) {
    return { category: 'urgent', priority: 'high', suggestedTools: ['get_overdue_visits', 'get_pending_collections'] };
  }
  
  // Data queries
  if (/visits?|schedule|today|beat|plan/i.test(lower)) {
    return { category: 'visits', priority: 'medium', suggestedTools: ['get_visit_summary', 'get_beat_schedule'] };
  }
  if (/sales|orders?|revenue|performance/i.test(lower)) {
    return { category: 'sales', priority: 'medium', suggestedTools: ['get_sales_report'] };
  }
  if (/payments?|pending|outstanding|collect|dues?/i.test(lower)) {
    return { category: 'payments', priority: 'high', suggestedTools: ['get_pending_collections'] };
  }
  if (/retailers?|customers?|shops?/i.test(lower)) {
    return { category: 'retailers', priority: 'medium', suggestedTools: ['get_retailer_analytics', 'check_retailer_status'] };
  }
  if (/stock|inventory|products?/i.test(lower)) {
    return { category: 'inventory', priority: 'medium', suggestedTools: ['get_inventory_status'] };
  }
  if (/scheme|offer|discount|promotion/i.test(lower)) {
    return { category: 'schemes', priority: 'medium', suggestedTools: ['get_active_schemes'] };
  }
  
  // Navigation queries
  if (/how (do|can|to)|where|navigate|go to|find|add|create/i.test(lower)) {
    return { category: 'navigation', priority: 'low', suggestedTools: ['get_navigation_help'] };
  }
  
  // Analytics
  if (/compare|trend|growth|analysis|top|best|worst/i.test(lower)) {
    return { category: 'analytics', priority: 'medium', suggestedTools: ['get_performance_trends'] };
  }
  
  return { category: 'general', priority: 'low', suggestedTools: [] };
}

// Execute database queries based on tool calls
async function executeQuery(supabase: any, userId: string, toolName: string, params: any) {
  const today = new Date().toISOString().split('T')[0];
  const { filters = {} } = params;
  
  switch(toolName) {
    case 'get_sales_report': {
      const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = filters.end_date || today;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`id, order_date, total_amount, status, retailers(name, address)`)
        .eq('user_id', userId)
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      
      const totalSales = data?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
      const confirmedOrders = data?.filter((o: any) => o.status === 'confirmed').length || 0;
      
      return {
        summary: { total_sales: totalSales, total_orders: data?.length || 0, confirmed_orders: confirmedOrders, period: `${startDate} to ${endDate}` },
        orders: data?.slice(0, 10)
      };
    }
    
    case 'get_visit_summary': {
      const { data, error } = await supabase
        .from('visits')
        .select(`id, planned_date, status, visit_type, retailers(name, address, phone)`)
        .eq('user_id', userId)
        .gte('planned_date', today)
        .order('planned_date', { ascending: true });
      
      if (error) throw error;
      
      return {
        total: data?.length || 0,
        completed: data?.filter((v: any) => v.status === 'completed').length || 0,
        pending: data?.filter((v: any) => v.status === 'scheduled').length || 0,
        in_progress: data?.filter((v: any) => v.status === 'in_progress').length || 0,
        visits: data?.slice(0, 15)
      };
    }
    
    case 'get_overdue_visits': {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('visits')
        .select(`id, planned_date, status, retailers(name, phone)`)
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .lt('planned_date', today)
        .order('planned_date', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return { overdue_count: data?.length || 0, visits: data };
    }
    
    case 'get_pending_collections': {
      const { data, error } = await supabase
        .from('retailers')
        .select(`id, name, phone, address, pending_amount, last_visit_date, last_order_value`)
        .eq('user_id', userId)
        .gt('pending_amount', 0)
        .order('pending_amount', { ascending: false })
        .limit(15);
      
      if (error) throw error;
      
      const totalPending = data?.reduce((sum: number, r: any) => sum + (r.pending_amount || 0), 0) || 0;
      return {
        total_pending: totalPending,
        retailer_count: data?.length || 0,
        retailers: data
      };
    }
    
    case 'get_retailer_analytics': {
      const { data, error } = await supabase
        .from('retailers')
        .select(`id, name, address, last_visit_date, last_order_value, avg_monthly_orders_3m, order_value, pending_amount`)
        .eq('user_id', userId)
        .order('last_order_value', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return { retailers: data };
    }
    
    case 'check_retailer_status': {
      const { retailer_name } = params;
      const { data, error } = await supabase
        .from('retailers')
        .select(`id, name, phone, address, last_visit_date, last_order_value, pending_amount, avg_monthly_orders_3m`)
        .eq('user_id', userId)
        .ilike('name', `%${retailer_name}%`)
        .limit(5);
      
      if (error) throw error;
      return { found: data?.length || 0, retailers: data };
    }
    
    case 'get_inventory_status': {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, stock_quantity, unit, price')
        .order('stock_quantity', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      
      const lowStock = data?.filter((p: any) => p.stock_quantity < 10) || [];
      return { 
        total_products: data?.length || 0,
        low_stock_count: lowStock.length,
        low_stock_items: lowStock,
        all_products: data 
      };
    }
    
    case 'get_active_schemes': {
      const { data, error } = await supabase
        .from('schemes')
        .select('id, name, description, scheme_type, min_quantity, discount_percentage, bonus_quantity, start_date, end_date')
        .eq('is_active', true)
        .gte('end_date', today)
        .order('end_date', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return { active_schemes: data?.length || 0, schemes: data };
    }
    
    case 'get_attendance': {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, check_in_time, check_out_time, status, total_hours')
        .eq('user_id', userId)
        .gte('date', weekAgo)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return { attendance: data };
    }
    
    case 'get_beat_schedule': {
      const targetDate = filters.date || today;
      const { data, error } = await supabase
        .from('beat_plans')
        .select('id, beat_name, beat_data, plan_date')
        .eq('user_id', userId)
        .eq('plan_date', targetDate)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { beat_plan: data };
    }
    
    case 'get_performance_trends': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [ordersResult, visitsResult] = await Promise.all([
        supabase.from('orders').select('order_date, total_amount')
          .eq('user_id', userId).gte('order_date', thirtyDaysAgo),
        supabase.from('visits').select('planned_date, status')
          .eq('user_id', userId).gte('planned_date', thirtyDaysAgo)
      ]);
      
      const totalSales = ordersResult.data?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
      const completedVisits = visitsResult.data?.filter((v: any) => v.status === 'completed').length || 0;
      const totalVisits = visitsResult.data?.length || 0;
      
      return {
        period: '30 days',
        total_sales: totalSales,
        order_count: ordersResult.data?.length || 0,
        visit_completion_rate: totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0,
        completed_visits: completedVisits,
        total_visits: totalVisits
      };
    }
    
    case 'get_navigation_help': {
      const { task } = params;
      const navigationGuides: Record<string, any> = {
        add_retailer: {
          path: '/add-retailer',
          steps: ['Go to My Retailers', 'Click + Add Retailer', 'Fill details', 'Save']
        },
        add_visit: {
          path: '/visits',
          steps: ['Go to My Visits', 'Click Plan Visit', 'Select retailers', 'Save']
        },
        add_order: {
          path: '/order-entry',
          steps: ['Start a visit', 'Click Order Entry', 'Add products', 'Submit']
        },
        view_analytics: {
          path: '/analytics',
          steps: ['Go to Analytics', 'Select report type', 'Choose date range', 'View']
        }
      };
      
      // Find best match
      const taskLower = (task || '').toLowerCase();
      for (const [key, guide] of Object.entries(navigationGuides)) {
        if (taskLower.includes(key.replace('_', ' ')) || taskLower.includes(key.replace('_', ''))) {
          return guide;
        }
      }
      return { message: 'Available guides: add retailer, add visit, add order, view analytics' };
    }
    
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Dynamic model selection based on query complexity and context
function selectModel(messages: any[], classification: any): { model: string; maxTokens: number; temperature: number } {
  const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
  
  // Very simple greetings - use fast model
  const greetingPatterns = [
    /^(hi|hello|hey|thanks|ok|bye|good morning|good evening)$/i,
  ];
  
  if (greetingPatterns.some(p => p.test(lastMessage.trim()))) {
    return { model: 'google/gemini-2.5-flash', maxTokens: 300, temperature: 0.7 };
  }
  
  // Complex analytics, comparisons, or urgent queries - use pro model
  if (classification.category === 'analytics' || 
      classification.priority === 'high' ||
      /compare|analyze|trend|why|explain|suggest|recommend|help me/i.test(lastMessage)) {
    return { model: 'google/gemini-2.5-pro', maxTokens: 2000, temperature: 0.5 };
  }
  
  // Default - use capable flash model for good conversational quality
  return { model: 'google/gemini-2.5-flash', maxTokens: 1200, temperature: 0.6 };
}

// Enhanced tools definition
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_sales_report",
      description: "Fetch sales data and order history with totals. Use for sales summary, revenue, order counts.",
      parameters: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            properties: {
              start_date: { type: "string", description: "Start date YYYY-MM-DD" },
              end_date: { type: "string", description: "End date YYYY-MM-DD" }
            }
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_visit_summary",
      description: "Get today's and upcoming visits with status (completed, scheduled, in_progress).",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_overdue_visits",
      description: "Find visits that were scheduled but not completed. Use for overdue, missed visits.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pending_collections",
      description: "Get retailers with outstanding payments. Use for pending payments, collections, dues.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_retailer_analytics",
      description: "Get top retailers by performance with order history and credit info.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "check_retailer_status",
      description: "Look up a specific retailer by name - shows visits, orders, credit, pending amounts.",
      parameters: {
        type: "object",
        properties: {
          retailer_name: { type: "string", description: "Name of retailer to look up" }
        },
        required: ["retailer_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_inventory_status",
      description: "Check product stock levels. Highlights low stock items.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_active_schemes",
      description: "Get currently active schemes, offers, and promotions.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance",
      description: "Get recent attendance records with check-in/out times.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_beat_schedule",
      description: "Get beat plan for a specific date.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Date YYYY-MM-DD, defaults to today" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_performance_trends",
      description: "Get 30-day performance trends - sales, visits, completion rates.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_navigation_help",
      description: "Get step-by-step guide for app tasks like adding retailers, orders, visits.",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string", description: "Task to get help for (add retailer, add order, etc.)" }
        }
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { messages, conversationId, pageContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token!);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get enhanced user context
    const userContext = await getUserContext(supabase, user.id);
    
    // Classify the query for routing
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    const classification = classifyQuery(lastUserMessage);
    console.log(`Query classification: ${JSON.stringify(classification)}`);

    // Build context-aware system prompt
    const { timeOfDay, isMonthEnd, isWeekend, dayOfMonth } = userContext.businessContext || {};
    const todayVisits = userContext.todayVisits || [];
    const pendingVisits = todayVisits.filter((v: any) => v.status === 'scheduled').length;
    const completedVisits = todayVisits.filter((v: any) => v.status === 'completed').length;
    
    // Add contextual tips based on business context
    let contextualTips = '';
    if (isMonthEnd) {
      contextualTips += '\n⚠️ Month-end: Focus on collections and closing pending orders.';
    }
    if (userContext.pendingCollections?.total > 0) {
      contextualTips += `\n💰 Pending collections: ₹${userContext.pendingCollections.total.toLocaleString('en-IN')} from ${userContext.pendingCollections.count} retailers.`;
    }
    if (pendingVisits > 0 && timeOfDay === 'afternoon') {
      contextualTips += `\n📍 ${pendingVisits} visits still pending today.`;
    }
    
    const systemPrompt = `You are a smart, friendly AI assistant for Bharath Beverages Field Sales Management. You help field sales representatives work more efficiently.

**Your Personality:**
- Be warm, helpful, and conversational - like a knowledgeable colleague
- Use natural language, not robotic responses
- Be proactive - suggest actions and share insights
- Keep responses concise but informative

**User Profile:**
- Name: ${userContext.profile?.full_name || 'User'}
- Role: ${userContext.userRole}
- Territory: ${userContext.territory || 'Not assigned'}
- Today's Beat: ${userContext.todayBeat || 'No beat planned'}

**Current Context:**
- Date: ${new Date().toLocaleDateString('en-IN')} (${timeOfDay})
- Day ${dayOfMonth} of month${isMonthEnd ? ' (Month-end)' : ''}${isWeekend ? ' (Weekend)' : ''}
${pageContext ? `- Current page: ${pageContext}` : ''}

**Today's Progress:**
- Visits: ${completedVisits}/${userContext.todayVisits.length} completed
- Pending: ${pendingVisits} visits remaining
${contextualTips}

**Recent Performance (7 days):**
- Orders: ${userContext.recentPerformance.orderCount}
- Sales: ₹${userContext.recentPerformance.totalSales.toLocaleString('en-IN')}

**How to Respond:**
- Greet users warmly and address them by name when appropriate
- For data queries, use the tools to fetch real-time information
- Present data in a readable format with bullet points
- Format currency as ₹X,XXX (Indian format)
- After showing data, offer helpful suggestions or next steps
- For "how to" questions, give clear step-by-step guidance
- If something isn't clear, ask clarifying questions
- Be encouraging and supportive of their sales efforts

**Available Quick Actions (suggest these when relevant):**
• Check visits → "my visits" or "today's schedule"
• Review payments → "pending payments" or "collections"
• Sales overview → "sales summary" or "my performance"
• Find retailers → "top retailers" or search by name
• View offers → "active schemes" or "promotions"

Use the available tools to fetch real-time data. Always interpret the data meaningfully for the user.`;

    // Select model based on query
    const { model, maxTokens, temperature } = selectModel(messages, classification);
    console.log(`Using model: ${model}, maxTokens: ${maxTokens}, temp: ${temperature}, category: ${classification.category}`);
    
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-12) // Keep more history for better context
    ];
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        stream: true,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Contact administrator.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI service unavailable. Please retry.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let toolCallsBuffer: any[] = [];
        let currentToolCall: any = null;
        
        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (!line.trim() || line.startsWith(':')) continue;
              if (!line.startsWith('data: ')) continue;
              
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                const finishReason = parsed.choices?.[0]?.finish_reason;
                
                // Handle tool calls
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (tc.index !== undefined) {
                      if (!toolCallsBuffer[tc.index]) {
                        toolCallsBuffer[tc.index] = { function: { name: '', arguments: '' } };
                      }
                      if (tc.function?.name) {
                        toolCallsBuffer[tc.index].function.name = tc.function.name;
                      }
                      if (tc.function?.arguments) {
                        toolCallsBuffer[tc.index].function.arguments += tc.function.arguments;
                      }
                    }
                  }
                }
                
                // Stream content
                if (delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                
                // Execute tool calls when done
                if (finishReason === 'tool_calls' && toolCallsBuffer.length > 0) {
                  for (const toolCall of toolCallsBuffer) {
                    if (toolCall.function?.name) {
                      try {
                        const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
                        console.log(`Executing tool: ${toolCall.function.name}`, args);
                        
                        const result = await executeQuery(supabase, user.id, toolCall.function.name, args);
                        
                        // Format result nicely
                        let formattedResult = `\n\n**${toolCall.function.name.replace(/_/g, ' ').replace(/^get /, '').toUpperCase()}:**\n\n`;
                        formattedResult += '```json\n' + JSON.stringify(result, null, 2) + '\n```';
                        
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: formattedResult }, index: 0 }]
                        })}\n\n`));
                      } catch (toolError: any) {
                        const errorMsg = toolError?.message || JSON.stringify(toolError) || 'Unknown error';
                        console.error(`Tool error (${toolCall.function.name}):`, toolError);
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          choices: [{ delta: { content: `\n\n⚠️ Could not fetch data: ${errorMsg}` }, index: 0 }]
                        })}\n\n`));
                      }
                    }
                  }
                  toolCallsBuffer = [];
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          console.error('Stream error:', e);
          controller.error(e);
        }
      }
    });

    console.log(`AI Assistant response time: ${Date.now() - startTime}ms`);

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
