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

    // Fetch invoice details with all related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        retailers(shop_name, phone, address, gst_number),
        companies(business_name, address, phone, email, gst_number)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    console.log('Invoice fetched:', invoice);

    // Fetch invoice items
    const { data: invoiceItems, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (itemsError) throw itemsError;

    // Fetch distributor info if mapped
    let distributorInfo = null;
    if (invoice.customer_id) {
      const { data: mapping } = await supabase
        .from('retailer_distributor_mapping')
        .select('distributors(name, contact_person, phone, address, gst_number)')
        .eq('retailer_id', invoice.customer_id)
        .eq('is_active', true)
        .single();
      
      if (mapping?.distributors) {
        distributorInfo = mapping.distributors;
      }
    }

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

    // Create detailed invoice message
    const company = invoice.companies;
    const retailer = invoice.retailers;
    const businessName = whatsappConfig.business_name || company?.business_name || 'Our Company';

    // Build FROM section (Company/Distributor)
    let fromSection = `*FROM:*\n`;
    if (distributorInfo) {
      fromSection += `${distributorInfo.name}\n`;
      if (distributorInfo.contact_person) fromSection += `${distributorInfo.contact_person}\n`;
      if (distributorInfo.address) fromSection += `${distributorInfo.address}\n`;
      if (distributorInfo.phone) fromSection += `Phone: ${distributorInfo.phone}\n`;
      if (distributorInfo.gst_number) fromSection += `GSTIN: ${distributorInfo.gst_number}\n`;
    } else if (company) {
      fromSection += `${company.business_name}\n`;
      if (company.address) fromSection += `${company.address}\n`;
      if (company.phone) fromSection += `Phone: ${company.phone}\n`;
      if (company.email) fromSection += `Email: ${company.email}\n`;
      if (company.gst_number) fromSection += `GSTIN: ${company.gst_number}\n`;
    }

    // Build BILL TO section
    let billToSection = `\n*BILL TO:*\n`;
    if (retailer) {
      billToSection += `${retailer.shop_name}\n`;
      if (retailer.address) billToSection += `${retailer.address}\n`;
      if (retailer.phone) billToSection += `Phone: ${retailer.phone}\n`;
      if (retailer.gst_number) billToSection += `GSTIN: ${retailer.gst_number}\n`;
    }

    // Build items section
    let itemsSection = `\n*ITEMS:*\n`;
    itemsSection += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (invoiceItems && invoiceItems.length > 0) {
      invoiceItems.forEach((item: any, index: number) => {
        itemsSection += `${index + 1}. ${item.description}\n`;
        itemsSection += `   ${item.quantity} ${item.unit} × ₹${item.price_per_unit.toFixed(2)} = ₹${item.taxable_amount.toFixed(2)}\n`;
      });
    }

    // Build totals section
    const cgstAmount = invoice.total_tax / 2;
    const sgstAmount = invoice.total_tax / 2;
    
    const totalsSection = `
━━━━━━━━━━━━━━━━━━━━━━
Subtotal: ₹${invoice.sub_total.toFixed(2)}
CGST (9%): ₹${cgstAmount.toFixed(2)}
SGST (9%): ₹${sgstAmount.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━
*Total Amount: ₹${invoice.total_amount.toFixed(2)}*
`;

    const message = `
🧾 *TAX INVOICE*

*Invoice No:* ${invoice.invoice_number}
*Date:* ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}

${fromSection}${billToSection}${itemsSection}${totalsSection}

*Status:* ${invoice.status === 'paid' ? '✅ Paid' : '⏳ Pending'}

Thank you for your business! 🙏
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
