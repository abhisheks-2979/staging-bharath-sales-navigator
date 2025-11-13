interface InvoicePreviewProps {
  company: any;
  retailer: any;
  cartItems: any[];
  orderId?: string;
  templateStyle: "template1" | "template2" | "template3" | "template4";
}

export default function InvoicePreview({
  company,
  retailer,
  cartItems,
  orderId = "INV001",
  templateStyle,
}: InvoicePreviewProps) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.rate || item.price || 0),
    0
  );
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  const total = subtotal + cgst + sgst;

  const getStyleClasses = () => {
    switch (templateStyle) {
      case "template1":
        return {
          container: "border-2 border-gray-800 bg-white text-black",
          header: "bg-blue-600 text-white",
          tableHeader: "bg-blue-600 text-white",
          totalBox: "bg-blue-600 text-white",
        };
      case "template2":
        return {
          container: "bg-white text-black",
          header: "bg-gray-700 text-white",
          tableHeader: "bg-gray-700 text-white",
          totalBox: "bg-gray-700 text-white",
        };
      case "template3":
        return {
          container: "bg-white text-black",
          header: "bg-gray-800 text-white",
          tableHeader: "bg-gray-800 text-white",
          totalBox: "bg-gray-800 text-white",
        };
      case "template4":
        return {
          container: "bg-white text-black",
          header: "bg-gray-800 text-white",
          tableHeader: "bg-green-600 text-white",
          totalBox: "bg-green-600 text-white",
        };
      default:
        return {
          container: "border border-gray-300 bg-white text-black",
          header: "bg-gray-800 text-white",
          tableHeader: "bg-gray-600 text-white",
          totalBox: "bg-gray-600 text-white",
        };
    }
  };

  const styles = getStyleClasses();

  return (
    <div className={`p-6 rounded-lg ${styles.container} max-w-4xl mx-auto text-sm`}>
      {/* Header */}
      <div className={`${styles.header} p-4 rounded-t-lg flex justify-between items-center mb-6`}>
        <div className="flex items-center gap-4">
          {company.logo_url && (
            <img src={company.logo_url} alt="Company Logo" className="w-28 h-28 object-contain" />
          )}
          <div>
            <h1 className="text-lg font-bold">{company.name || "COMPANY NAME"}</h1>
            <p className="text-xs opacity-90">{company.address}</p>
            {company.contact_phone && <p className="text-xs">Tel: {company.contact_phone}</p>}
            {company.email && <p className="text-xs">Email: {company.email}</p>}
            {company.gstin && <p className="text-xs">GSTIN: {company.gstin}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold">INVOICE</h2>
        </div>
      </div>

      {/* Bill To & Invoice Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-xs mb-2">BILL TO</h3>
          <p className="text-blue-600 font-semibold">{retailer.name || "Customer Name"}</p>
          <p className="text-xs">{retailer.address}</p>
          {retailer.phone && <p className="text-xs">Phone: {retailer.phone}</p>}
          {retailer.gst_number && <p className="text-xs">GSTIN: {retailer.gst_number}</p>}
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="font-bold text-xs">INVOICE #:</span>{" "}
            <span className="text-xs">{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div>
            <span className="font-bold text-xs">DATE:</span>{" "}
            <span className="text-xs">{new Date().toLocaleDateString("en-GB")}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className={styles.tableHeader}>
              <th className="border border-gray-300 p-2 text-center text-xs">NO</th>
              <th className="border border-gray-300 p-2 text-left text-xs">DESCRIPTION</th>
              <th className="border border-gray-300 p-2 text-center text-xs">HSN/SAC</th>
              <th className="border border-gray-300 p-2 text-center text-xs">UNIT</th>
              <th className="border border-gray-300 p-2 text-center text-xs">QTY</th>
              <th className="border border-gray-300 p-2 text-right text-xs">PRICE</th>
              <th className="border border-gray-300 p-2 text-right text-xs">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="border border-gray-300 p-2 text-center text-xs">{index + 1}</td>
                <td className="border border-gray-300 p-2 text-xs">{item.product_name || item.name}</td>
                <td className="border border-gray-300 p-2 text-center text-xs">{item.hsn_code || "-"}</td>
                <td className="border border-gray-300 p-2 text-center text-xs">{item.unit || "Piece"}</td>
                <td className="border border-gray-300 p-2 text-center text-xs">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right text-xs">
                  ₹{(item.rate || item.price || 0).toFixed(2)}
                </td>
                <td className="border border-gray-300 p-2 text-right text-xs">
                  ₹{((item.quantity || 0) * (item.rate || item.price || 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span className="font-bold text-xs">SUB-TOTAL</span>
            <span className="text-xs">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-bold text-xs">SGST (2.5%)</span>
            <span className="text-xs">₹{sgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="font-bold text-xs">CGST (2.5%)</span>
            <span className="text-xs">₹{cgst.toFixed(2)}</span>
          </div>
          <div className={`${styles.totalBox} p-2 rounded flex justify-between`}>
            <span className="font-bold text-sm">Total</span>
            <span className="font-bold text-sm">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment & Terms */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-xs mb-2">PAYMENT METHOD</h3>
          {company.bank_name && <p className="text-xs">Bank: {company.bank_name}</p>}
          {company.account_holder_name && <p className="text-xs">Account Holder: {company.account_holder_name}</p>}
          {company.bank_account && <p className="text-xs">Account Number: {company.bank_account}</p>}
          {company.ifsc && <p className="text-xs">IFSC Code: {company.ifsc}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold mb-1">For {company.name || "Company"}</p>
          <div className="mt-8 pt-4 border-t border-gray-400">
            <p className="text-xs italic">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="mb-4">
        <h3 className="font-bold text-xs mb-2">TERMS AND CONDITIONS</h3>
        <p className="text-xs text-blue-600">
          {company.terms_conditions || "Thank you for your business!"}
        </p>
      </div>

      {/* Footer */}
      <div className={`${styles.header} p-3 rounded-b-lg text-center mt-6`}>
        <p className="text-xl font-bold mb-2">THANK YOU FOR YOUR BUSINESS</p>
        <p className="text-xs opacity-90">
          {[company.address, company.contact_phone, company.email].filter(Boolean).join(" - ")}
        </p>
      </div>
    </div>
  );
}
