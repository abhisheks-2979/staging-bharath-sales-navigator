import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().optional(),
  contact_phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")).transform(val => val || undefined),
  gstin: z.string().optional(),
  state: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  ifsc: z.string().optional(),
  account_holder_name: z.string().optional(),
  qr_upi: z.string().optional(),
  terms_conditions: z.string().optional(),
});

export default function CompanySettings() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setCompanies(data);
      setSelectedCompany(data[0]);
      // Type-safe form reset
      form.reset({
        name: data[0].name || "",
        address: data[0].address || "",
        contact_phone: data[0].contact_phone || "",
        email: data[0].email || "",
        gstin: data[0].gstin || "",
        state: data[0].state || "",
        bank_name: data[0].bank_name || "",
        bank_account: data[0].bank_account || "",
        ifsc: data[0].ifsc || "",
        account_holder_name: data[0].account_holder_name || "",
        qr_upi: data[0].qr_upi || "",
        terms_conditions: data[0].terms_conditions || "",
      });
    }
  };

  const onSubmit = async (data: z.infer<typeof companySchema>) => {
    setLoading(true);
    try {
      // Type-safe data preparation
      const insertData: Database['public']['Tables']['companies']['Insert'] = {
        name: data.name,
        address: data.address || null,
        contact_phone: data.contact_phone || null,
        email: data.email || null,
        gstin: data.gstin || null,
        state: data.state || null,
        bank_name: data.bank_name || null,
        bank_account: data.bank_account || null,
        ifsc: data.ifsc || null,
        account_holder_name: data.account_holder_name || null,
        qr_upi: data.qr_upi || null,
        terms_conditions: data.terms_conditions || null,
      };
      
      if (selectedCompany) {
        const { error } = await supabase
          .from("companies")
          .update(insertData)
          .eq("id", selectedCompany.id);
        if (error) throw error;
        toast.success("Company updated successfully");
      } else {
        const { error } = await supabase.from("companies").insert(insertData);
        if (error) throw error;
        toast.success("Company created successfully");
      }
      fetchCompanies();
    } catch (error: any) {
      console.error("Error saving company:", error);
      toast.error(error.message || "Failed to save company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC Pvt Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input placeholder="22AAAAA0000A1Z5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="company@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="Gujarat" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Company address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="HDFC Bank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Pvt Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ifsc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="HDFC0001234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qr_upi"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>UPI ID</FormLabel>
                      <FormControl>
                        <Input placeholder="company@upi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="terms_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter default terms and conditions"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Company Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
