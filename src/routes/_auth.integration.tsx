import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Code2, Copy, KeyRound, Plug } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { env } from "@/lib/env";

export const Route = createFileRoute("/_auth/integration")({
  component: IntegrationPage,
});

function IntegrationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Plug className="h-6 w-6 text-muted-foreground" />
          FBR Integration
        </h1>
        <p className="text-sm text-muted-foreground">
          Push invoices into ZarnTaxSync from your ERP, POS, or backend service.
        </p>
      </div>

      <Tabs defaultValue="guide">
        <TabsList>
          <TabsTrigger value="guide">Guide</TabsTrigger>
          <TabsTrigger value="curl">cURL example</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="guide">
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                <code>POST /integration/invoices</code> is the entry point for
                external systems. Same body as the web UI's invoice form.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Generate an API key for an Integration user under{" "}
                  <Link to="/users" className="text-primary hover:underline">
                    Users → API Keys
                  </Link>
                  . Copy the <code>rawKey</code> when shown — it's only displayed once.
                </li>
                <li>
                  Send the invoice JSON to <code>POST /integration/invoices</code>{" "}
                  with the headers <code>X-Api-Key: …</code> and (optionally){" "}
                  <code>X-External-Reference-Id: &lt;your-id&gt;</code>.
                </li>
                <li>
                  ZarnTaxSync forwards to FBR Digital Invoicing and returns the
                  IRN, FBR status, and per-line item statuses.
                </li>
              </ol>
              <Alert variant="info">
                <AlertTitle>X-External-Reference-Id</AlertTitle>
                <AlertDescription>
                  Treat as an idempotency key on your side. Re-sending the same
                  reference ID returns the original response without duplicating
                  the invoice.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curl">
          <CurlExample />
        </TabsContent>

        <TabsContent value="auth">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Authentication
              </CardTitle>
              <CardDescription>
                External callers authenticate via <code>X-Api-Key</code>, not
                Bearer JWT.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Bearer JWT is for the web SPA only. ERP/POS systems should:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Provision a dedicated user (e.g. <code>integration@your-erp.com</code>).</li>
                <li>Generate a long-lived API key for that user.</li>
                <li>Send all integration calls with <code>X-Api-Key</code>.</li>
                <li>Rotate the key periodically; revoke immediately on compromise.</li>
              </ul>
              <Button asChild>
                <Link to="/users">
                  <KeyRound className="h-4 w-4" />
                  Manage API keys
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurlExample() {
  const [copied, setCopied] = useState(false);

  const baseUrl = env.VITE_API_BASE_URL;
  const snippet = `curl -X POST "${baseUrl}/integration/invoices" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: <your-api-key>" \\
  -H "X-External-Reference-Id: ERP-${Math.floor(100000 + Math.random() * 900000)}" \\
  --data '{
    "invoiceType": "SaleInvoice",
    "invoiceDate": "${new Date().toISOString().slice(0, 10)}",
    "sellerNtnCnic": "1234567",
    "sellerBusinessName": "Acme Pvt Ltd",
    "sellerProvince": "Punjab",
    "sellerAddress": "123 Mall Road, Lahore",
    "buyerNtnCnic": "0000000",
    "buyerBusinessName": "Walk-in customer",
    "buyerProvince": "Punjab",
    "buyerAddress": "Lahore",
    "buyerRegistrationType": "Unregistered",
    "saleType": "Local",
    "scenarioId": 1,
    "totalQuantity": 1,
    "totalSalesTax": 180,
    "totalBillAmount": 1180,
    "items": [{
      "itemSequence": 1,
      "hsCode": "8471.30.10",
      "productDescription": "Notebook computer",
      "rate": 18,
      "uoM": "PCS",
      "quantity": 1,
      "totalValues": 1180,
      "valueSalesExcludingSt": 1000,
      "fixedNotifiedValueOrRetailPrice": 0,
      "salesTaxApplicable": 180,
      "salesTaxWithheldAtSource": 0,
      "extraTax": 0,
      "furtherTax": 0,
      "fedPayable": 0,
      "discount": 0,
      "saleType": "Local"
    }]
  }'`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast.success("Snippet copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — select manually");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Sample cURL request
          </CardTitle>
          <CardDescription>
            Replace <code>&lt;your-api-key&gt;</code> with the rawKey value
            you copied when generating the key.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
          {snippet}
        </pre>
      </CardContent>
    </Card>
  );
}
