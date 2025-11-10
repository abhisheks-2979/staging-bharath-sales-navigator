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

    // Get WhatsApp business number from config
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('business_phone_number, business_name')
      .eq('is_active', true)
      .maybeSingle();

    if (configError) {
      console.error('WhatsApp config error:', configError);
    }

    console.log('WhatsApp config:', whatsappConfig);

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Format phone numbers - ensure they have + prefix
    const formatPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    };

    const toPhone = formatPhone(customerPhone);
    const fromPhone = twilioWhatsappNumber.startsWith('whatsapp:') 
      ? twilioWhatsappNumber 
      : `whatsapp:${formatPhone(twilioWhatsappNumber)}`;
    const toWhatsapp = `whatsapp:${toPhone}`;

    console.log('Phone numbers:', { from: fromPhone, to: toWhatsapp });

    // Create simple message
    const businessName = whatsappConfig?.business_name || 'BHARATH BEVERAGES';
    const message = `Thank you for placing order with ${businessName}

Here is your attached invoice below

${invoiceNumber || 'Invoice'}.pdf`;

    console.log('Sending message:', message);
    console.log('PDF URL:', pdfUrl);

    // Send WhatsApp message via Twilio with PDF attachment
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const params = new URLSearchParams({
      From: fromPhone,
      To: toWhatsapp,
      Body: message,
    });

    // Add PDF as media if URL provided
    if (pdfUrl) {
      params.append('MediaUrl', pdfUrl);
    }

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Twilio error:', result);
      throw new Error(result.message || 'Failed to send WhatsApp message');
    }

    console.log('WhatsApp sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.sid,
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
