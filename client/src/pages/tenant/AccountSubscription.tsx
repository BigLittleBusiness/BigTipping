import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, CreditCard, Receipt } from "lucide-react";

export default function AccountSubscription() {
  const { data: subscription, refetch } = trpc.account.getSubscription.useQuery();
  const { data: billing } = trpc.account.getBillingHistory.useQuery();

  // Org details form — mirrors subscriptions table columns
  const [orgName, setOrgName] = useState("");
  const [orgABN, setOrgABN] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [invoiceRecipientName, setInvoiceRecipientName] = useState("");
  const [invoiceRecipientEmail, setInvoiceRecipientEmail] = useState("");
  const [invoicePONumber, setInvoicePONumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "invoice">("invoice");
  const [paymentTerm, setPaymentTerm] = useState<"monthly" | "annually">("monthly");

  useEffect(() => {
    if (subscription) {
      setOrgName(subscription.orgName ?? "");
      setOrgABN(subscription.orgABN ?? "");
      setOrgAddress(subscription.orgAddress ?? "");
      setOrgPhone(subscription.orgPhone ?? "");
      setInvoiceRecipientName(subscription.invoiceRecipientName ?? "");
      setInvoiceRecipientEmail(subscription.invoiceRecipientEmail ?? "");
      setInvoicePONumber(subscription.invoicePONumber ?? "");
      setPaymentMethod(subscription.paymentMethod ?? "invoice");
      setPaymentTerm(subscription.paymentTerm ?? "monthly");
    }
  }, [subscription]);

  const updateSubscription = trpc.account.updateSubscription.useMutation({
    onSuccess: () => { toast.success("Account details saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    updateSubscription.mutate({
      orgName,
      orgABN,
      orgAddress,
      orgPhone,
      invoiceRecipientName,
      invoiceRecipientEmail: invoiceRecipientEmail || undefined,
      invoicePONumber,
      paymentMethod,
      paymentTerm,
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account &amp; Subscription</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your organisation details, plan, and billing history</p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-muted-foreground" />
              <CardTitle className="text-base">Current Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!subscription ? (
              <p className="text-sm text-muted-foreground">No subscription data yet. Save your details below to get started.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-100 text-purple-700 text-sm px-3 py-0.5">
                    {subscription.level}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Payment Term</p>
                    <p className="font-semibold mt-0.5 capitalize">{subscription.paymentTerm}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Payment Method</p>
                    <p className="font-semibold mt-0.5 capitalize">{subscription.paymentMethod.replace("_", " ")}</p>
                  </div>
                  {subscription.cardLast4 && (
                    <div>
                      <p className="text-muted-foreground text-xs">Card</p>
                      <p className="font-semibold mt-0.5">{subscription.cardBrand} •••• {subscription.cardLast4}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => toast.info("Plan upgrade — contact support")}>
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Organisation Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-muted-foreground" />
              <CardTitle className="text-base">Organisation Details</CardTitle>
            </div>
            <CardDescription>These details appear on invoices and notification emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Organisation Name</Label>
                <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Footy Club" />
              </div>
              <div className="space-y-1.5">
                <Label>ABN</Label>
                <Input value={orgABN} onChange={e => setOrgABN(e.target.value)} placeholder="12 345 678 901" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" value={orgPhone} onChange={e => setOrgPhone(e.target.value)} placeholder="+61 4xx xxx xxx" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={orgAddress} onChange={e => setOrgAddress(e.target.value)} placeholder="123 Main St, Melbourne VIC 3000" />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-semibold mb-3">Invoice Settings</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Invoice Recipient Name</Label>
                  <Input value={invoiceRecipientName} onChange={e => setInvoiceRecipientName(e.target.value)} placeholder="Finance Team" />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Email</Label>
                  <Input type="email" value={invoiceRecipientEmail} onChange={e => setInvoiceRecipientEmail(e.target.value)} placeholder="finance@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>PO Number</Label>
                  <Input value={invoicePONumber} onChange={e => setInvoicePONumber(e.target.value)} placeholder="PO-2025-001" />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as "credit_card" | "invoice")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Billing Frequency</Label>
                <Select value={paymentTerm} onValueChange={v => setPaymentTerm(v as "monthly" | "annually")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button disabled={updateSubscription.isPending} onClick={handleSave}>
                {updateSubscription.isPending ? "Saving…" : "Save Details"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-muted-foreground" />
              <CardTitle className="text-base">Billing History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!billing || billing.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No billing history yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Description</th>
                    <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 text-muted-foreground">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-2">{item.description ?? "—"}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {item.currency.toUpperCase()} {(item.amount / 100).toFixed(2)}
                      </td>
                      <td className="py-2 px-2">
                        <Badge className={item.status === "paid" ? "bg-green-100 text-green-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        {item.invoiceUrl ? (
                          <a href={item.invoiceUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                            Download
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
