import CompanySettings from "@/components/invoice/CompanySettings";

export default function InvoiceManagement() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your company information and invoice settings
        </p>
      </div>

      <CompanySettings />
    </div>
  );
}
