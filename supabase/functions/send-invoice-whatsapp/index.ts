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

  // Helper to send SMS via Twilio with retry logic
  const sendSmsViaTwilio = async (
    businessName: string,
    customerPhone: string,
    pdfUrl: string,
    invoiceNumber: string,
    maxRetries = 2
  ): Promise<Response | null> => {
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

        if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
          console.error('Twilio credentials missing');
          throw new Error('Twilio credentials not configured');
        }

        const formatPhoneForSMS = (phone: string) => {
          const cleaned = phone.replace(/\D/g, '');
          return cleaned.startsWith('91') ? `+${cleaned}` : `+91${cleaned}`; // E.164 with +
        };

        const toPhone = formatPhoneForSMS(customerPhone);
        console.log(`SMS Attempt ${attempt + 1}: Sending to ${toPhone}`);
        
        const message = `Thank you for your order with ${businessName}!\n\nInvoice Number: ${invoiceNumber || 'N/A'}\n\nClick here to view your invoice: ${pdfUrl || ''}`;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const formBody = new URLSearchParams({ To: toPhone, From: twilioFromNumber, Body: message });

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody,
        });

        const result = await response.json();
        console.log(`Twilio SMS attempt ${attempt + 1} response:`, result);

        if (!response.ok) {
          // Check if it's a trial account limitation
          if (result.code === 21608 || result.message?.includes('unverified')) {
            console.error('TWILIO TRIAL ACCOUNT: Number needs verification or account upgrade required');
            console.error('Solution: Verify number at twilio.com/user/account/phone-numbers/verified OR upgrade to paid account');
          }
          throw new Error(result.message || 'Failed to send SMS via Twilio');
        }

        console.log('✅ SMS sent successfully via Twilio');
        return new Response(
          JSON.stringify({
            success: true,
            channel: 'sms',
            messageId: result.sid,
            message: 'Invoice sent via SMS',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (smsError) {
        lastError = smsError;
        console.error(`SMS attempt ${attempt + 1} failed:`, smsError);
        
        if (attempt < maxRetries) {
          console.log(`Retrying SMS in 1 second... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error('All SMS attempts failed:', lastError);
    return null; // Return null after all retries exhausted
  };

  // Declare variables outside try-catch so they're accessible in fallback
  let invoiceId: string;
  let customerPhone: string;
  let pdfUrl: string;
  let invoiceNumber: string;
  let businessName = 'BHARATH BEVERAGES';

  try {
    const body = await req.json();
    invoiceId = body.invoiceId;
    customerPhone = body.customerPhone;
    pdfUrl = body.pdfUrl;
    invoiceNumber = body.invoiceNumber;

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
      .from('companies')
      .select('name')
      .limit(1)
      .maybeSingle();

    businessName = companyConfig?.name || 'BHARATH BEVERAGES';

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

    // Try WhatsApp with retry logic
    let whatsappSuccess = false;
    let whatsappRetries = 2;
    
    for (let attempt = 0; attempt <= whatsappRetries; attempt++) {
      try {
        console.log(`WhatsApp attempt ${attempt + 1}/${whatsappRetries + 1}`);
        
        const response = await fetch(whatchimpUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatchimpApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(whatsappPayload),
        });

        const result = await response.json();
        console.log(`WhatChimp attempt ${attempt + 1} response:`, result);

        if (!response.ok) {
          console.error('WhatChimp error:', result);
          throw new Error(result.error?.message || 'Failed to send WhatsApp message');
        }

        console.log('✅ WhatsApp message sent successfully:', result);
        whatsappSuccess = true;
        
        // Also send SMS via Twilio (primary path)
        await sendSmsViaTwilio(businessName, customerPhone, pdfUrl, invoiceNumber);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            channel: 'whatsapp+sms',
            messageId: result.messages?.[0]?.id,
            message: 'Invoice sent via WhatsApp and SMS successfully' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (whatsappError) {
        console.error(`WhatsApp attempt ${attempt + 1} failed:`, whatsappError);
        
        if (attempt < whatsappRetries) {
          console.log(`Retrying WhatsApp in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // All WhatsApp attempts failed, throw to trigger SMS fallback
          throw whatsappError;
        }
      }
    }

  } catch (error) {
    console.error('❌ WhatsApp failed after all retries, falling back to SMS only:', error);

    // Fallback to SMS via Twilio if WhatsApp fails
    const smsResponse = await sendSmsViaTwilio(businessName, customerPhone, pdfUrl, invoiceNumber);

    if (smsResponse) {
      console.log('✅ Fallback SMS sent successfully');
      return smsResponse;
    }

    // If SMS also fails, return detailed error
    console.error('❌ Both WhatsApp and SMS failed');
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send invoice notification',
        details: {
          whatsapp_error: (error as any).message,
          sms_status: 'failed',
          troubleshooting: 'Check Twilio account (trial limitations) and WhatChimp API credentials'
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
