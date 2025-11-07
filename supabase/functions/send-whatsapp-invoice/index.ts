import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const { orderId } = await req.json();
    console.log('Sending WhatsApp invoice for order:', orderId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch order and retailer data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        retailers (
          name,
          phone
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
      throw new Error('Failed to fetch order details');
    }

    if (!order?.retailers?.phone) {
      throw new Error('Customer phone number not available');
    }

    console.log('Order details:', {
      id: order.id,
      retailer: order.retailers.name,
      phone: order.retailers.phone,
      total: order.total_amount
    });

    // Format phone number for WhatsApp (remove any non-numeric characters and add country code if needed)
    let customerPhone = order.retailers.phone.replace(/[^0-9]/g, '');
    
    // If phone doesn't start with country code, assume India (+91)
    if (!customerPhone.startsWith('91') && customerPhone.length === 10) {
      customerPhone = '91' + customerPhone;
    }

    // Generate invoice message
    const message = `Hello ${order.retailers.name},\n\n` +
      `Thank you for your order!\n` +
      `Order Number: ${order.id.substring(0, 8)}\n` +
      `Total Amount: ₹${order.total_amount}\n\n` +
      `Your invoice has been generated.\n\n` +
      `Thank you for your business!`;

    console.log('Sending message to:', customerPhone);

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams({
      From: `whatsapp:${twilioWhatsAppNumber}`,
      To: `whatsapp:+${customerPhone}`,
      Body: message,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();
    console.log('Twilio response:', twilioData);

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      throw new Error(twilioData.message || 'Failed to send WhatsApp message');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp message sent successfully',
        messageSid: twilioData.sid 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp-invoice function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
