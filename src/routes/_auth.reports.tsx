import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";

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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/common/DataTable";
import { InvoiceStatusBadge } from "@/components/invoice/InvoiceStatusBadge";
import {
  getComplianceReport,
  getFailedInvoices,
  type ComplianceReport,
} from "@/api/reports";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatPKR } from "@/lib/format";
import type { InvoiceListItem } from "@/api/invoices";

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
});

export const Route = createFileRoute("/_auth/reports")({
  validateSearch: SearchSchema,
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Compliance posture, failed invoices, and SRO risk.
        </p>
      </div>

      <Tabs defaultValue="compliance">
        <TabsList>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="failed">Failed invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="compliance">
          <ComplianceTab />
        </TabsContent>
        <TabsContent value="failed">
          <FailedInvoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Compliance tab --------------------------------------------

function ComplianceTab() {
  const [turnover, setTurnover] = useState<string>("");
  const [result, setResult] = useState<ComplianceReport | null>(null);

  const compliance = useMutation({
    mutationFn: (annualTurnover: number) => getComplianceReport(annualTurnover),
    onSuccess: setResult,
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(turnover);
    if (!Number.isFinite(value) || value < 0) return;
    compliance.mutate(value);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Run a compliance check</CardTitle>
          <CardDescription>
            Enter your tenant's annual turnover (PKR) to estimate Rule 150Q
            compliance and SRO risk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              id="turnover"
              label="Annual turnover (PKR)"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 250000000"
              value={turnover}
              onChange={(e) => setTurnover(e.target.value)}
            />
            <Button type="submit" disabled={compliance.isPending}>
              {compliance.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <TrendingUp className="h-4 w-4" />
              Run check
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>
            Server-computed; refresh after invoicing activity changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Run a check to see compliance posture.
            </p>
          ) : (
            <div className="space-y-4">
              <Row
                label="Rule 150Q compliance"
                badge={
                  result.isRule150QCompliant ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Compliant
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Non-compliant
                    </Badge>
                  )
                }
              />
              <Row
                label="SRO risk"
                badge={
                  result.isSroRiskDetected ? (
                    <Badge variant="warning">Risk detected</Badge>
                  ) : (
                    <Badge variant="success">No risk</Badge>
                  )
                }
              />
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Penalty risk estimate
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {formatPKR(result.penaltyRiskEstimate)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Alert variant="info" className="lg:col-span-2">
        <AlertTitle>How this is calculated</AlertTitle>
        <AlertDescription>
          The backend evaluates your invoice activity against Rule 150Q
          thresholds and SRO scope. The penalty estimate is conservative — talk
          to a tax advisor before relying on the figure for filings.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Row({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge}
    </div>
  );
}

// ---------------- Failed invoices tab ---------------------------------------

function FailedInvoicesTab() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "failed-invoices", search.page],
    queryFn: () =>
      getFailedInvoices({ pageNumber: search.page, pageSize: 10 }),
    staleTime: 30_000,
  });

  const columns: ColumnDef<InvoiceListItem>[] = [
    {
      header: "Date",
      accessorKey: "invoiceDate",
      cell: ({ row }) => formatDate(row.original.invoiceDate),
    },
    {
      header: "Buyer",
      accessorKey: "buyerBusinessName",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
    },
    {
      id: "tax",
      header: () => <div className="text-right">Tax</div>,
      cell: ({ row }) => (
        <div className="text-right">{formatPKR(row.original.totalSalesTax)}</div>
      ),
    },
    {
      header: () => <span className="sr-only">Action</span>,
      id: "actions",
      cell: ({ row }) => (
        <Link
          to="/invoices/$id"
          params={{ id: row.original.id }}
          className="text-sm text-primary hover:underline"
        >
          Open
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<InvoiceListItem, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) =>
          navigate({ to: "/reports", search: { page } })
        }
        getRowId={(row) => row.id}
        emptyState="No failed invoices — nice."
      />
    </div>
  );
}
