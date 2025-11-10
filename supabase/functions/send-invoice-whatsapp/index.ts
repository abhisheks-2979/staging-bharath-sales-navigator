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

    console.log('Sending WhatsApp invoice:', { invoiceId, customerPhone, pdfUrl, invoiceNumber });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get WhatsApp business config for business name
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('business_name')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('WhatsApp config error:', configError);
    }

    console.log('WhatsApp config:', whatsappConfig);

    // Get WhatChimp credentials
    const whatchimpApiKey = Deno.env.get('WHATCHIMP_API_KEY');
    const whatchimpPhoneNumberId = Deno.env.get('WHATCHIMP_PHONE_NUMBER_ID');

    if (!whatchimpApiKey || !whatchimpPhoneNumberId) {
      throw new Error('WhatChimp credentials not configured');
    }

    // Format phone number - remove any non-digit characters
    const formatPhone = (phone: string) => {
      return phone.replace(/\D/g, '');
    };

    const toPhone = formatPhone(customerPhone);

    console.log('Sending to phone:', toPhone);

    const businessName = whatsappConfig?.business_name || 'BHARATH BEVERAGES';
    
    // Check if template messaging is enabled (set this to true once template is approved)
    const useTemplate = Deno.env.get('WHATCHIMP_USE_TEMPLATE') === 'true';
    const templateName = Deno.env.get('WHATCHIMP_TEMPLATE_NAME') || 'invoice_delivery';

    let response;

    if (useTemplate) {
      // Send using WhatsApp Template (works outside 24-hour window)
      console.log('Sending template message:', templateName);
      
      const whatchimpTemplateUrl = 'https://app.whatchimp.com/api/v1/whatsapp/send-template';
      
      const templateParams = new URLSearchParams({
        apiToken: whatchimpApiKey,
        phone_number_id: whatchimpPhoneNumberId,
        phone_number: toPhone,
        template_name: templateName,
        template_language: 'en',
        // Template variables in order: {{1}} businessName, {{2}} invoiceNumber, {{3}} pdfUrl
        template_body_variables: JSON.stringify([
          businessName,
          invoiceNumber || 'Invoice',
          pdfUrl || 'Processing...'
        ])
      });

      response = await fetch(whatchimpTemplateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: templateParams,
      });
    } else {
      // Send regular message (only works within 24-hour window)
      console.log('Sending regular message (24-hour window required)');
      
      const message = `Thank you for placing order with ${businessName}!

Here is your invoice: ${invoiceNumber || 'Invoice'}

Download PDF: ${pdfUrl || 'Processing...'}`;

      console.log('Message content:', message);

      const whatchimpUrl = 'https://app.whatchimp.com/api/v1/whatsapp/send';
      
      const params = new URLSearchParams({
        apiToken: whatchimpApiKey,
        phone_number_id: whatchimpPhoneNumberId,
        phone_number: toPhone,
        message: message,
      });

      response = await fetch(whatchimpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
    }

    const result = await response.json();
    
    // Check WhatChimp response status
    if (result.status === "0" || !response.ok) {
      console.error('WhatChimp error:', result);
      throw new Error(result.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.wa_message_id,
        message: result.message || 'Invoice sent via WhatsApp successfully' 
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
