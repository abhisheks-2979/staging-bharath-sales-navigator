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
    const { invoiceId, customerPhone } = await req.json();

    if (!invoiceId || !customerPhone) {
      throw new Error('Invoice ID and customer phone number are required');
    }

    console.log('Sending WhatsApp invoice:', { invoiceId, customerPhone });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        retailer:retailers(shop_name, phone_number),
        company:company_settings(business_name)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    console.log('Invoice fetched:', invoice);

    // Get WhatsApp business number from config
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_config')
      .select('business_phone_number, business_name')
      .eq('is_active', true)
      .single();

    if (configError) {
      console.error('WhatsApp config error:', configError);
      throw new Error('WhatsApp configuration not found. Please configure in Invoice Management settings.');
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

    // Create message
    const businessName = whatsappConfig.business_name || invoice.company?.business_name || 'Our Company';
    const message = `
*Invoice from ${businessName}*

Invoice No: ${invoice.invoice_number}
Date: ${new Date(invoice.invoice_date).toLocaleDateString()}
Customer: ${invoice.retailer?.shop_name || 'Customer'}

Total Amount: ₹${invoice.total_amount.toFixed(2)}

Thank you for your business!

View your invoice online or download the PDF from our portal.
    `.trim();

    console.log('Sending message:', message);

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromPhone,
        To: toWhatsapp,
        Body: message,
      }),
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
