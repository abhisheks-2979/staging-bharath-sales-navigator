import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache for user context (5 min TTL)
const userContextCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getUserContext(supabase: any, userId: string) {
  const cached = userContextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Fetch user context in parallel
  const [profileResult, rolesResult, todayVisitsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, username').eq('id', userId).single(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase.from('visits').select('id, status').eq('user_id', userId).gte('planned_date', new Date().toISOString().split('T')[0]).lte('planned_date', new Date().toISOString().split('T')[0])
  ]);

  const context = {
    profile: profileResult.data,
    isAdmin: rolesResult.data?.some((r: any) => r.role === 'admin'),
    userRole: rolesResult.data?.some((r: any) => r.role === 'admin') ? 'Manager/Admin' : 'Field Sales User',
    todayVisits: todayVisitsResult.data || []
  };

  userContextCache.set(userId, { data: context, timestamp: Date.now() });
  return context;
}

async function executeQuery(supabase: any, userId: string, params: any) {
  const { query_type, filters = {} } = params;
  const today = new Date().toISOString().split('T')[0];
  
  switch(query_type) {
    case 'sales_report': {
      const startDate = filters.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = filters.end_date || today;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_date, total_amount, status,
          retailers(name, address)
        `)
        .eq('user_id', userId)
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false });
      
      if (error) throw error;
      
      const totalSales = data?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
      const confirmedOrders = data?.filter((o: any) => o.status === 'confirmed').length || 0;
      
      return {
        summary: {
          total_sales: totalSales,
          total_orders: data?.length || 0,
          confirmed_orders: confirmedOrders,
          period: `${startDate} to ${endDate}`
        },
        orders: data?.slice(0, 10) // Return top 10 recent orders
      };
    }
    
    case 'visit_summary': {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, planned_date, status, visit_type,
          retailers(name, address, phone)
        `)
        .eq('user_id', userId)
        .gte('planned_date', today)
        .order('planned_date', { ascending: true });
      
      if (error) throw error;
      
      return {
        total: data?.length || 0,
        completed: data?.filter((v: any) => v.status === 'completed').length || 0,
        pending: data?.filter((v: any) => v.status === 'scheduled').length || 0,
        visits: data
      };
    }
    
    case 'retailer_analytics': {
      const { data, error } = await supabase
        .from('retailers')
        .select(`
          id, name, address, last_visit_date, last_order_value,
          avg_monthly_orders_3m, order_value, pending_amount
        `)
        .eq('user_id', userId)
        .order('last_visit_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return { retailers: data };
    }
    
    case 'attendance': {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, check_in_time, check_out_time, status, total_hours')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      return { attendance: data };
    }
    
    case 'inventory': {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, stock_quantity, unit, price')
        .order('stock_quantity', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      return { products: data };
    }
    
    default:
      throw new Error(`Unknown query type: ${query_type}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { messages, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token!);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get cached user context
    const userContext = await getUserContext(supabase, user.id);

    // Enhanced system prompt with real-time context
    const pendingVisits = userContext.todayVisits.filter((v: any) => v.status === 'scheduled').length;
    const completedVisits = userContext.todayVisits.filter((v: any) => v.status === 'completed').length;
    
    const systemPrompt = `You are an AI assistant for Bharath Beverages Field Sales Management.
User: ${userContext.profile?.full_name || 'User'} (${userContext.userRole})
Today: ${new Date().toLocaleDateString('en-IN')}

Today's Status:
- Total visits planned: ${userContext.todayVisits.length}
- Completed: ${completedVisits} | Pending: ${pendingVisits}

Quick Commands (teach users these shortcuts):
• "my visits" / "today's schedule" → Show beat plan
• "sales summary" → Performance overview
• "pending payments" → Outstanding collections
• "top retailers" → Best performers
• "stock levels" → Inventory status

Core Capabilities:
1. Sales Reports & Analytics - Real-time data from your territory
2. Visit Tracking - Beat plans, retailer visits, order entry
3. Retailer Management - Performance, credit, history
4. Inventory - Stock levels, product availability
5. Payments - Outstanding amounts, collection tracking

Response Guidelines:
- Be brief and action-oriented (field users are on the go)
- Use bullet points and tables for clarity
- Always include relevant numbers (₹ amounts, counts)
- Provide next steps when applicable
- Format currency as ₹X,XXX

Use the available tools to fetch real data and help the user efficiently.`;

    // Define field sales specialized tools
    const tools = [
      {
        type: "function",
        function: {
          name: "query_database",
          description: "Fetch sales data, visit summaries, retailer analytics, attendance, or inventory. Returns real data from the database.",
          parameters: {
            type: "object",
            properties: {
              query_type: {
                type: "string",
                enum: ["sales_report", "visit_summary", "retailer_analytics", "attendance", "inventory"],
                description: "Type of data to fetch. sales_report: order history with totals; visit_summary: today's visits with status; retailer_analytics: top retailers with performance; attendance: recent attendance records; inventory: product stock levels"
              },
              filters: {
                type: "object",
                description: "Optional filters for date range or specific criteria",
                properties: {
                  start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
                  end_date: { type: "string", description: "End date in YYYY-MM-DD format" }
                }
              }
            },
            required: ["query_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_beat_schedule",
          description: "Get today's beat plan and scheduled visits for the user",
          parameters: {
            type: "object",
            properties: {
              date: { 
                type: "string", 
                description: "Date in YYYY-MM-DD format, defaults to today" 
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "check_retailer_status",
          description: "Quick lookup for a specific retailer - shows last visit, credit status, pending payments",
          parameters: {
            type: "object",
            properties: {
              retailer_name: { 
                type: "string", 
                description: "Name of the retailer to look up" 
              }
            },
            required: ["retailer_name"]
          }
        }
      }
    ];

    // Messages are already limited on frontend, use directly
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
    
    // Call Lovable AI with optimized settings
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        tools: tools,
        tool_choice: 'auto', // Let AI decide when to use tools
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait a moment and try again.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits exhausted. Please contact your administrator.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ 
        error: 'AI service temporarily unavailable. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process streaming response and handle tool calls
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let toolCallsBuffer: any[] = [];
        
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
                
                // Check for tool calls
                if (delta?.tool_calls) {
                  toolCallsBuffer.push(...delta.tool_calls);
                }
                
                // Stream content to user
                if (delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                
                // Check if done
                if (parsed.choices?.[0]?.finish_reason === 'tool_calls') {
                  // Execute tool calls
                  for (const toolCall of toolCallsBuffer) {
                    if (toolCall.function?.name === 'query_database') {
                      const args = JSON.parse(toolCall.function.arguments);
                      const result = await executeQuery(supabase, user.id, args);
                      
                      // Format result as markdown table
                      let formattedResult = `\n\n**${args.query_type.replace('_', ' ').toUpperCase()} Results:**\n\n`;
                      formattedResult += JSON.stringify(result, null, 2);
                      
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        choices: [{
                          delta: { content: formattedResult },
                          index: 0
                        }]
                      })}\n\n`));
                    }
                  }
                  toolCallsBuffer = [];
                }
              } catch (e) {
                console.error('Parse error:', e);
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

    const responseTime = Date.now() - startTime;
    console.log(`AI Assistant response time: ${responseTime}ms`);

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat assistant error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});