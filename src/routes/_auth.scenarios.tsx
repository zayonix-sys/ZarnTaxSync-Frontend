import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, BookmarkCheck, CheckSquare, Loader2, Play } from "lucide-react";

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
import { DataTable } from "@/components/common/DataTable";
import { ScenarioStatusBadge } from "@/components/scenarios/ScenarioStatusBadge";
import { RequireRole } from "@/components/common/RequireRole";
import {
  useCertifyScenario,
  useRunScenario,
  useScenarioSummary,
  useScenariosList,
} from "@/hooks/useScenarios";
import { useAuthStore } from "@/stores/auth";
import { useTenantProfileStore } from "@/stores/tenantProfile";
import { getApplicableScenarios } from "@/lib/scenarioMatrix";
import type { Scenario } from "@/api/types";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_auth/scenarios")({
  component: ScenariosPage,
});

function ScenariosPage() {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const profile = useTenantProfileStore((s) =>
    tenantId ? s.profiles[tenantId] : undefined,
  );

  const applicable = useMemo(
    () =>
      profile
        ? getApplicableScenarios(profile.businessActivity, profile.sector)
        : null,
    [profile],
  );

  const hasTenantContext = Boolean(tenantId);
  const { data: scenarios, isLoading } = useScenariosList(hasTenantContext);
  const { data: summary } = useScenarioSummary(hasTenantContext);

  const filtered = useMemo(() => {
    if (!scenarios) return [];
    if (!applicable) return scenarios;
    const set = new Set(applicable);
    return scenarios.filter((s) => set.has(s.scenarioNumber));
  }, [scenarios, applicable]);

  const runMutation = useRunScenario();
  const certifyMutation = useCertifyScenario();

  if (!tenantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No tenant context</CardTitle>
          <CardDescription>
            Scenarios are scoped to a tenant. SuperAdmin users should impersonate
            a tenant first (Phase 5).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const columns: ColumnDef<Scenario>[] = [
    {
      header: "#",
      accessorKey: "scenarioNumber",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          SN{String(row.original.scenarioNumber).padStart(3, "0")}
        </span>
      ),
      size: 80,
    },
    {
      header: "Scenario",
      accessorKey: "scenarioName",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.scenarioName}</div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <ScenarioStatusBadge status={row.original.status} />,
      size: 100,
    },
    {
      header: "Last run",
      accessorKey: "runAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.runAt ? formatDateTime(row.original.runAt) : "—"}
        </span>
      ),
    },
    {
      header: "Certified",
      accessorKey: "certifiedAt",
      cell: ({ row }) =>
        row.original.certifiedAt ? (
          <Badge variant="info">{formatDateTime(row.original.certifiedAt)}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      header: () => <span className="sr-only">Actions</span>,
      id: "actions",
      cell: ({ row }) => {
        const s = row.original;
        const isRunning =
          runMutation.isPending && runMutation.variables === s.scenarioNumber;
        const isCertifying =
          certifyMutation.isPending &&
          certifyMutation.variables === s.scenarioNumber;
        return (
          <div className="flex items-center justify-end gap-1">
            <RequireRole anyOf={["SuperAdmin", "TenantAdmin", "BranchManager"]} hideOnDeny>
              <Button
                variant="ghost"
                size="sm"
                disabled={isRunning}
                onClick={() => runMutation.mutate(s.scenarioNumber)}
              >
                {isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Run
              </Button>
            </RequireRole>
            <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
              <Button
                variant="ghost"
                size="sm"
                disabled={s.status !== "Passed" || isCertifying}
                onClick={() => certifyMutation.mutate(s.scenarioNumber)}
              >
                {isCertifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookmarkCheck className="h-3.5 w-3.5" />
                )}
                Certify
              </Button>
            </RequireRole>
          </div>
        );
      },
    },
  ];

  // Compute scoped summary if we know the applicable subset.
  const scopedSummary = useMemo(() => {
    if (!summary) return null;
    if (!applicable) return summary;
    const passed = filtered.filter((s) => s.status === "Passed").length;
    const failed = filtered.filter((s) => s.status === "Failed").length;
    const pending = filtered.filter((s) => s.status === "Pending").length;
    const total = applicable.length;
    return {
      total,
      passed,
      failed,
      pending,
      progressPercent: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  }, [summary, applicable, filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CheckSquare className="h-6 w-6 text-muted-foreground" />
          Sandbox Scenarios
        </h1>
        <p className="text-sm text-muted-foreground">
          PRAL FBR Digital Invoicing certification scenarios. Run each scenario
          and certify once it passes.
        </p>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Backend gap B1</AlertTitle>
        <AlertDescription>
          Scenario payloads are placeholder values. FBR will reject most runs
          until the backend ships real payloads. This warning is non-dismissible.
        </AlertDescription>
      </Alert>

      {!applicable && (
        <Alert variant="info">
          <AlertTitle>Set business activity</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span>
              We can't filter applicable scenarios until the tenant's business
              activity and sector are set.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/tenants/$id" params={{ id: tenantId }}>
                Open tenant Overview tab
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {scopedSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Certification progress</CardTitle>
            <CardDescription>
              {scopedSummary.passed} of {scopedSummary.total} applicable
              scenarios passed ({scopedSummary.progressPercent}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-[width]"
                style={{ width: `${scopedSummary.progressPercent}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Badge variant="success">{scopedSummary.passed} passed</Badge>
              <Badge variant="destructive">{scopedSummary.failed} failed</Badge>
              <Badge variant="secondary">{scopedSummary.pending} pending</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable<Scenario, unknown>
        columns={columns}
        data={filtered}
        loading={isLoading}
        getRowId={(row) => String(row.scenarioNumber)}
        emptyState={
          applicable
            ? "No scenarios applicable to this business activity."
            : "No scenarios available."
        }
      />
    </div>
  );
}
