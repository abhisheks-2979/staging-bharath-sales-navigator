import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CompanySettings from "@/components/invoice/CompanySettings";

export default function InvoiceManagement() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice & Company Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage invoice templates and company information
          </p>
        </div>
      </div>

      <CompanySettings />
    </div>
  );
}
