import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, productNames } = await req.json();
    
    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'No transcript provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing voice order transcript:', transcript);
    console.log('Available products count:', productNames?.length || 0);

    const systemPrompt = `You are an order parsing assistant for a sales app. Parse voice commands into structured product orders.

IMPORTANT RULES:
1. Extract product names, quantities, and units from natural speech
2. Handle Hindi/English mixed inputs (e.g., "adrak" = ginger, "haldi" = turmeric)
3. Common unit phrases: "kg", "gram", "grams", "pieces", "pcs", "packet", "box"
4. When user says "[product] [weight] [quantity]", interpret as: product name, unit type, and quantity
   - Example: "adrak 250 gram 5 kg" means "Adrak, 5, kg" (5 kg of Adrak)
   - Example: "vayu 50 gram 3 pieces" means "Vayu, 3, pieces" (3 pieces of Vayu)
5. If quantity is unclear, default to 1
6. If unit is unclear, default to "kg"
7. Match product names to the provided product list if possible

AVAILABLE PRODUCTS (for reference):
${productNames?.slice(0, 100).join(', ') || 'No product list provided'}

Return ONLY a valid JSON array with this structure:
[
  {"name": "Product Name", "quantity": 5, "unit": "kg"},
  {"name": "Another Product", "quantity": 3, "unit": "pieces"}
]

If you cannot parse any products, return an empty array: []`;

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
          { role: 'user', content: `Parse this voice order: "${transcript}"` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', aiResponse);

    // Parse the JSON from AI response
    let parsedOrders = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedOrders = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedOrders = [];
    }

    console.log('Parsed orders:', parsedOrders);

    return new Response(
      JSON.stringify({ orders: parsedOrders }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice order parser error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
