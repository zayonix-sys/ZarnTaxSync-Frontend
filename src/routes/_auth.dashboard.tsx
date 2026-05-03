import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Plug,
  Plus,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, useReportsTokenStatus } from "@/hooks/useDashboard";
import { useInvoicesList } from "@/hooks/useInvoices";
import { InvoiceStatusBadge } from "@/components/invoice/InvoiceStatusBadge";
import { useAuthStore } from "@/stores/auth";
import { formatDate, formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: tokenStatus } = useReportsTokenStatus();
  const { data: recent, isLoading: recentLoading } = useInvoicesList({
    pageNumber: 1,
    pageSize: 5,
  });

  const chartData = useMemo(
    () =>
      (dashboard?.last7Days ?? []).map((d) => ({
        date: formatDate(d.date, "dd MMM"),
        Submitted: d.submitted,
        Failed: d.failed,
        Pending: d.pending,
      })),
    [dashboard],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {user?.firstName ?? "there"}
          </h1>
          <p className="text-sm text-muted-foreground">
            FBR Digital Invoicing snapshot
            {tokenStatus && (
              <>
                {" · "}
                <Badge
                  variant={
                    tokenStatus.environment === "Production" ? "success" : "warning"
                  }
                  className="ml-1"
                >
                  {tokenStatus.environment}
                </Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/invoices/upload">
              <Upload className="h-4 w-4" />
              Upload Excel
            </Link>
          </Button>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Submitted today"
          value={dashboard?.submittedToday}
          loading={dashLoading}
          icon={CheckCircle2}
          tone="text-success"
        />
        <KpiCard
          label="Failed today"
          value={dashboard?.failedToday}
          loading={dashLoading}
          icon={AlertCircle}
          tone="text-destructive"
        />
        <KpiCard
          label="Pending today"
          value={dashboard?.pendingToday}
          loading={dashLoading}
          icon={Clock}
          tone="text-warning"
        />
        <KpiCard
          label="Deferred today"
          value={dashboard?.deferredToday}
          loading={dashLoading}
          icon={Activity}
          tone="text-primary"
          hint="Backend H5 pending — reads 0 until deferred queue ships."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Last 7 days</CardTitle>
            <CardDescription>
              Submissions, failures, and pending counts.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {dashLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <EmptyState message="No activity in the last 7 days." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Submitted" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Failed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pending" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FBR sync status</CardTitle>
            <CardDescription>Token + environment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Environment">
              {tokenStatus ? (
                <Badge
                  variant={
                    tokenStatus.environment === "Production" ? "success" : "warning"
                  }
                >
                  {tokenStatus.environment}
                </Badge>
              ) : (
                <Skeleton className="h-5 w-20" />
              )}
            </Row>
            <Row label="Token expires">
              {tokenStatus ? (
                <span>{formatDate(tokenStatus.expiresAt)}</span>
              ) : (
                <Skeleton className="h-4 w-24" />
              )}
            </Row>
            <Row label="Days remaining">
              {tokenStatus ? (
                <Badge
                  variant={
                    tokenStatus.daysRemaining <= 0
                      ? "destructive"
                      : tokenStatus.daysRemaining <= 30
                        ? "warning"
                        : "success"
                  }
                >
                  {tokenStatus.daysRemaining}
                </Badge>
              ) : (
                <Skeleton className="h-5 w-12" />
              )}
            </Row>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/integration">
                  <Plug className="h-4 w-4" />
                  Open integration
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>Latest 5 invoices for this tenant.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !recent?.items.length ? (
            <EmptyState message="No invoices yet — create your first invoice.">
              <Button asChild size="sm" className="mt-2">
                <Link to="/invoices/new">
                  <Plus className="h-4 w-4" />
                  New invoice
                </Link>
              </Button>
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {recent.items.map((inv) => (
                <li key={inv.id}>
                  <Link
                    to="/invoices/$id"
                    params={{ id: inv.id }}
                    className="flex flex-wrap items-center gap-3 px-1 py-2.5 text-sm hover:bg-muted/40"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">
                      {inv.fbrInvoiceNumber ?? "—"}
                    </span>
                    <span className="font-medium">{inv.buyerBusinessName}</span>
                    <span className="text-muted-foreground">
                      {formatDate(inv.invoiceDate)}
                    </span>
                    <InvoiceStatusBadge status={inv.status} className="ml-auto" />
                    <span className="w-32 text-right font-medium">
                      {formatPKR(inv.totalSalesTax + inv.totalSalesExcludingSt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  loading,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={cn("h-4 w-4", tone)} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-2xl font-semibold">{value ?? 0}</div>
        )}
        {hint && (
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function EmptyState({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center px-4 py-10 text-center text-sm text-muted-foreground">
      <div>
        {message}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
