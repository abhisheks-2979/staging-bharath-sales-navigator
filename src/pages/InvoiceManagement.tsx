import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceList from "@/components/invoice/InvoiceList";
import CreateInvoiceForm from "@/components/invoice/CreateInvoiceForm";
import CompanySettings from "@/components/invoice/CompanySettings";
import CustomerManagement from "@/components/invoice/CustomerManagement";
import { WhatsAppConfig } from "@/components/WhatsAppConfig";

export default function InvoiceManagement() {
  const [activeTab, setActiveTab] = useState("invoices");
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage invoices with GST calculations
          </p>
        </div>
        {activeTab === "invoices" && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoice Template</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="settings">Company Settings</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          {showCreateForm ? (
            <CreateInvoiceForm onClose={() => setShowCreateForm(false)} />
          ) : (
            <InvoiceList />
          )}
        </TabsContent>

        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="settings">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
