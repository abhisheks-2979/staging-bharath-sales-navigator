import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Get user from auth header
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token!);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', user.id)
      .single();

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');
    const userRole = isAdmin ? 'Manager/Admin' : 'Field Sales User';

    // Build context-aware system prompt
    const systemPrompt = `You are an AI assistant for a Field Sales Management System. 
    
Current User: ${profile?.full_name || 'User'}
Role: ${userRole}

You help users with:
1. **Generating Reports**: Sales reports, visit summaries, retailer analytics, competition insights, attendance, inventory
2. **Data Analysis**: Trends, comparisons, performance metrics
3. **Quick Actions**: Creating orders, scheduling visits, marking payments, logging expenses
4. **Navigation**: Helping users find features and pages
5. **Insights**: Proactive suggestions based on user data

Available Functions:
- query_database: Execute database queries to fetch reports and analytics
- create_record: Create new records (orders, visits, retailers, etc.)
- update_record: Update existing records (payments, status, etc.)
- navigate: Help users navigate to specific pages

Be conversational, helpful, and concise. When generating reports, format data clearly with tables or summaries.
Always confirm destructive actions before execution.`;

    // Define available tools for function calling
    const tools = [
      {
        type: "function",
        function: {
          name: "query_database",
          description: "Execute database queries to fetch reports, analytics, and data summaries",
          parameters: {
            type: "object",
            properties: {
              query_type: {
                type: "string",
                enum: ["sales_report", "visit_summary", "retailer_analytics", "competition_insights", "attendance", "inventory", "custom"],
                description: "Type of query to execute"
              },
              filters: {
                type: "object",
                description: "Filters to apply (date_range, territory, user, etc.)",
                properties: {
                  start_date: { type: "string" },
                  end_date: { type: "string" },
                  territory_id: { type: "string" },
                  user_id: { type: "string" }
                }
              },
              custom_sql: {
                type: "string",
                description: "Custom SQL query (only for specific requests)"
              }
            },
            required: ["query_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_record",
          description: "Create new records like orders, visits, retailers, expenses, etc.",
          parameters: {
            type: "object",
            properties: {
              record_type: {
                type: "string",
                enum: ["order", "visit", "retailer", "expense", "competition_data"],
                description: "Type of record to create"
              },
              data: {
                type: "object",
                description: "Record data to insert"
              }
            },
            required: ["record_type", "data"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_record",
          description: "Update existing records like payment status, order status, etc.",
          parameters: {
            type: "object",
            properties: {
              record_type: {
                type: "string",
                enum: ["payment", "order_status", "visit_status", "stock"],
                description: "Type of record to update"
              },
              record_id: {
                type: "string",
                description: "ID of the record to update"
              },
              updates: {
                type: "object",
                description: "Fields to update"
              }
            },
            required: ["record_type", "record_id", "updates"]
          }
        }
      }
    ];

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please contact administrator.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream the response back
    return new Response(response.body, {
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