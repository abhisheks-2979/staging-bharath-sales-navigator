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
    const { invoiceId, customerPhone, pdfUrl, invoiceNumber } = await req.json();

    if (!invoiceId || !customerPhone) {
      throw new Error('Order ID and customer phone number are required');
    }

    console.log('Sending invoice via WhatsApp:', { invoiceId, customerPhone, pdfUrl, invoiceNumber });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get company config for business name
    const { data: companyConfig } = await supabase
      .from('company_info')
      .select('name')
      .limit(1)
      .maybeSingle();

    const businessName = companyConfig?.name || 'BHARATH BEVERAGES';

    // Get WhatChimp credentials
    const whatchimpApiKey = Deno.env.get('WHATCHIMP_API_KEY');
    const whatchimpPhoneNumberId = Deno.env.get('WHATCHIMP_PHONE_NUMBER_ID');
    const templateName = Deno.env.get('WHATCHIMP_TEMPLATE_NAME') || 'invoice_notification';

    if (!whatchimpApiKey || !whatchimpPhoneNumberId) {
      throw new Error('WhatChimp credentials not configured');
    }

    // Format phone number - ensure it has country code without +
    const formatPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      // If doesn't start with country code, assume India (91)
      return cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
    };

    const toPhone = formatPhone(customerPhone);
    console.log('Sending to phone:', toPhone);

    // Send via WhatChimp WhatsApp API with template
    const whatchimpUrl = `https://api.whatchimp.com/v1/${whatchimpPhoneNumberId}/messages`;

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: businessName
              },
              {
                type: 'text',
                text: invoiceNumber || 'N/A'
              }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: pdfUrl || ''
              }
            ]
          }
        ]
      }
    };

    console.log('WhatsApp payload:', JSON.stringify(whatsappPayload, null, 2));

    const response = await fetch(whatchimpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatchimpApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload),
    });

    const result = await response.json();
    console.log('WhatChimp response:', result);

    if (!response.ok) {
      console.error('WhatChimp error:', result);
      throw new Error(result.error?.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp message sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messages?.[0]?.id,
        message: 'Invoice sent via WhatsApp successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-invoice-whatsapp:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
