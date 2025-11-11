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

    console.log('Sending invoice via Twilio SMS:', { invoiceId, customerPhone, pdfUrl, invoiceNumber });

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

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Format phone number - ensure it has country code
    const formatPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      // If doesn't start with country code, assume India (+91)
      return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`;
    };

    const toPhone = formatPhone(customerPhone);
    console.log('Sending to phone:', toPhone);

    // Create short link message
    const message = `Thank you for your order with ${businessName}!

Invoice: ${invoiceNumber || 'N/A'}

Download your invoice: ${pdfUrl || 'Processing...'}`;

    console.log('Message content:', message);

    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    // Create form body
    const formBody = new URLSearchParams({
      To: toPhone,
      From: twilioPhoneNumber,
      Body: message,
    });

    // Send via Twilio
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    const result = await response.json();
    console.log('Twilio response:', result);

    if (!response.ok) {
      console.error('Twilio error:', result);
      throw new Error(result.message || 'Failed to send SMS via Twilio');
    }

    console.log('SMS sent successfully via Twilio:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.sid,
        message: 'Invoice sent via SMS successfully' 
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
