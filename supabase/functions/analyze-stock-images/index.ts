import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, productSkuImages } = await req.json();
    console.log('Analyzing stock images', { imageCount: images.length, skuImageCount: productSkuImages.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Prepare the analysis prompt
    const analysisPrompt = `You are analyzing images from a retail store shelf to count products.

Reference Product SKU Images:
${productSkuImages.map((p: any, i: number) => `${i + 1}. Product: ${p.name} (SKU: ${p.sku})`).join('\n')}

Task:
1. Look at the shelf images provided
2. Identify which products from the reference SKU images appear in the shelf images
3. Count how many units of each product you can see
4. Return ONLY a JSON array with this exact structure:
[
  {
    "productId": "uuid-here",
    "productName": "Product Name",
    "sku": "SKU-CODE",
    "count": 5,
    "confidence": 0.85
  }
]

Rules:
- Only include products you can clearly identify
- Count visible units only
- If you're not confident about a product (confidence < 0.6), don't include it
- Return empty array [] if no products are identified
- Return ONLY the JSON array, no other text`;

    // Prepare messages with images
    const messages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt }
        ]
      }
    ];

    // Add reference SKU images
    for (const skuImage of productSkuImages) {
      if (skuImage.imageUrl) {
        messages[0].content.push({
          type: 'image_url',
          image_url: { url: skuImage.imageUrl }
        });
      }
    }

    // Add shelf images to analyze
    for (const image of images) {
      messages[0].content.push({
        type: 'image_url',
        image_url: { url: image }
      });
    }

    console.log('Calling Lovable AI for vision analysis');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('Lovable AI response received');
    
    const content = aiData.choices?.[0]?.message?.content || '[]';
    console.log('AI analysis result:', content);

    // Parse the JSON response
    let detectedProducts = [];
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        detectedProducts = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('No JSON array found in AI response');
        detectedProducts = [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      detectedProducts = [];
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        detectedProducts,
        message: `Analyzed ${images.length} image(s), detected ${detectedProducts.length} product(s)`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-stock-images:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        detectedProducts: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});