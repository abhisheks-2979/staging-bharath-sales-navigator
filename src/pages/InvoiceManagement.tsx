import CompanySettings from "@/components/invoice/CompanySettings";

export default function InvoiceManagement() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Invoice & Company Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage invoice templates and company information
        </p>
      </div>

      <CompanySettings />
    </div>
  );
}
