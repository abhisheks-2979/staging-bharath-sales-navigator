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
      throw new Error('Order ID and customer phone number are required');
    }

    console.log('Sending WhatsApp invoice:', { invoiceId, customerPhone });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details with order items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', invoiceId)
      .single();

    if (orderError) throw orderError;

    console.log('Order fetched:', order);

    // Fetch company data
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (companyError) console.error('Error fetching company:', companyError);

    // Fetch retailer data
    let retailerData = null;
    if (order.retailer_id) {
      const { data: retailer } = await supabase
        .from('retailers')
        .select('name, address, phone, gst_number')
        .eq('id', order.retailer_id)
        .single();

      retailerData = retailer;
    }

    // Fetch distributor info if mapped
    let distributorInfo = null;
    if (order.retailer_id && order.user_id) {
      const { data: mapping } = await supabase
        .from('distributor_retailer_mappings')
        .select('distributor_id')
        .eq('retailer_id', order.retailer_id)
        .eq('user_id', order.user_id)
        .maybeSingle();
      
      if (mapping?.distributor_id) {
        const { data: distributor } = await supabase
          .from('retailers')
          .select('name, address, phone, gst_number')
          .eq('id', mapping.distributor_id)
          .eq('entity_type', 'distributor')
          .maybeSingle();
        
        if (distributor) {
          distributorInfo = distributor;
        }
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
    const company = companyData;
    const retailer = retailerData;
    const businessName = whatsappConfig.business_name || company?.name || 'BHARATH BEVERAGES';

    // Generate invoice number
    const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(order.created_at);

    // Build FROM section (Company/Distributor)
    let fromSection = `*FROM:*\n`;
    if (distributorInfo) {
      fromSection += `${distributorInfo.name}\n`;
      if (distributorInfo.address) fromSection += `${distributorInfo.address}\n`;
      if (distributorInfo.phone) fromSection += `Phone: ${distributorInfo.phone}\n`;
      if (distributorInfo.gst_number) fromSection += `GSTIN: ${distributorInfo.gst_number}\n`;
    } else if (company) {
      fromSection += `${company.name}\n`;
      if (company.address) fromSection += `${company.address}\n`;
      if (company.contact_phone) fromSection += `Phone: ${company.contact_phone}\n`;
      if (company.email) fromSection += `Email: ${company.email}\n`;
      if (company.gstin) fromSection += `GSTIN: ${company.gstin}\n`;
    }

    // Build BILL TO section
    let billToSection = `\n*BILL TO:*\n`;
    if (retailer) {
      billToSection += `${retailer.name}\n`;
      if (retailer.address) billToSection += `${retailer.address}\n`;
      if (retailer.phone) billToSection += `Phone: ${retailer.phone}\n`;
      if (retailer.gst_number) billToSection += `GSTIN: ${retailer.gst_number}\n`;
    }

    // Build items section
    let itemsSection = `\n*ITEMS:*\n`;
    itemsSection += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    const orderItems = order.order_items || [];
    if (orderItems && orderItems.length > 0) {
      orderItems.forEach((item: any, index: number) => {
        const quantity = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const total = Number(item.total || 0);
        itemsSection += `${index + 1}. ${item.product_name}\n`;
        itemsSection += `   ${quantity} ${item.unit || 'Kg'} × Rs ${rate.toFixed(2)} = Rs ${total.toFixed(2)}\n`;
      });
    }

    // Calculate totals
    const subtotal = Number(order.subtotal || 0);
    const totalAmount = Number(order.total_amount || 0);
    const totalTax = totalAmount - subtotal;
    const cgstAmount = totalTax / 2;
    const sgstAmount = totalTax / 2;
    
    const totalsSection = `
━━━━━━━━━━━━━━━━━━━━━━
Subtotal: Rs ${subtotal.toFixed(2)}
CGST (9%): Rs ${cgstAmount.toFixed(2)}
SGST (9%): Rs ${sgstAmount.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━
*Total Amount: Rs ${totalAmount.toFixed(2)}*
`;

    const message = `
🧾 *TAX INVOICE*

*Invoice No:* ${invoiceNumber}
*Date:* ${invoiceDate.toLocaleDateString('en-IN')}

${fromSection}${billToSection}${itemsSection}${totalsSection}

*Status:* ${order.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}

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
