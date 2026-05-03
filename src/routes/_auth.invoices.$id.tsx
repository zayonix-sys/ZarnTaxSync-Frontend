import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Ban,
  Download,
  Loader2,
  Receipt,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoice/InvoiceStatusBadge";
import { SubmissionLogsAccordion } from "@/components/invoice/SubmissionLogsAccordion";
import { RequireRole } from "@/components/common/RequireRole";
import { useCancelInvoice, useInvoice } from "@/hooks/useInvoices";
import { downloadInvoicePdf } from "@/api/invoices";
import { formatDate, formatNtnCnic, formatPKR } from "@/lib/format";

export const Route = createFileRoute("/_auth/invoices/$id")({
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const cancel = useCancelInvoice(id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
        <p className="text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const onDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(invoice.id);
      toast.success("PDF download started");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  const canCancel = invoice.status === "Draft" || invoice.status === "Pending";

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {invoice.invoiceType === "DebitNote" ? "Debit Note" : "Sale Invoice"}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {formatDate(invoice.createdAt)} ·{" "}
              {invoice.submittedAt
                ? `Submitted ${formatDate(invoice.submittedAt)}`
                : "Not yet submitted"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onDownloadPdf} disabled={pdfBusy}>
              {pdfBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            {canCancel && (
              <RequireRole anyOf={["SuperAdmin", "TenantAdmin", "BranchManager"]} hideOnDeny>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmCancel(true)}
                  disabled={cancel.isPending}
                >
                  <Ban className="h-4 w-4" />
                  Cancel invoice
                </Button>
              </RequireRole>
            )}
          </div>
        </div>
      </div>

      {invoice.fbrInvoiceNumber && invoice.status === "Submitted" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Receipt className="h-5 w-5 text-success" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                FBR Invoice Reference Number (IRN)
              </div>
              <div className="font-mono text-lg font-semibold">
                {invoice.fbrInvoiceNumber}
              </div>
            </div>
            <Badge variant="success" className="ml-auto">
              Legally certified
            </Badge>
          </CardContent>
        </Card>
      )}

      {invoice.status === "Failed" && (
        <Alert variant="destructive">
          <ScrollText className="h-4 w-4" />
          <AlertTitle>FBR submission failed</AlertTitle>
          <AlertDescription>
            <span className="font-mono text-xs">
              {invoice.fbrStatusCode ?? "—"}
            </span>{" "}
            — {invoice.fbrStatusMessage ?? "See submission history below."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">{invoice.sellerBusinessName}</div>
            <div className="text-muted-foreground">
              NTN/CNIC {formatNtnCnic(invoice.sellerNtnCnic)}
            </div>
            <div className="text-muted-foreground">
              {invoice.sellerProvince} · {invoice.sellerAddress}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buyer</CardTitle>
            <CardDescription>
              {invoice.buyerRegistrationType === "Registered" ? "Registered" : "Unregistered"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">{invoice.buyerBusinessName}</div>
            {invoice.buyerNtnCnic && (
              <div className="text-muted-foreground">
                NTN/CNIC {formatNtnCnic(invoice.buyerNtnCnic)}
              </div>
            )}
            <div className="text-muted-foreground">
              {invoice.buyerProvince} · {invoice.buyerAddress}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>
            {invoice.items.length} item{invoice.items.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>HS code / Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Excl. ST</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.itemSequence}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.itemSequence}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs">{item.hsCode}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.productDescription}
                    </div>
                    {item.fbrItemError && (
                      <div className="mt-1 text-xs text-destructive">
                        {item.fbrItemErrorCode} — {item.fbrItemError}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.uoM}</TableCell>
                  <TableCell className="text-right">{item.rate}%</TableCell>
                  <TableCell className="text-right">
                    {formatPKR(item.valueSalesExcludingSt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPKR(item.salesTaxApplicable)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPKR(item.totalValues)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:max-w-sm sm:ml-auto">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total quantity</span>
              <span>{invoice.totalQuantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total sales tax</span>
              <span>{formatPKR(invoice.totalSalesTax)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total bill amount</span>
              <span>{formatPKR(invoice.totalBillAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubmissionLogsAccordion invoiceId={invoice.id} />

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this invoice?</DialogTitle>
            <DialogDescription>
              This invoice cannot be resubmitted after cancellation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep invoice
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await cancel.mutateAsync();
                setConfirmCancel(false);
                navigate({ to: "/invoices" });
              }}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Cancel invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
