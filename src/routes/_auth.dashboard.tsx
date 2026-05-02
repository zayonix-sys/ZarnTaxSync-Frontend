import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {user?.firstName ?? "there"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Dashboard insights ship in Phase 4. Use the navigation to explore
          tenants and scenarios.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Submitted today" value="—" icon={CheckCircle2} tone="text-success" />
        <KpiCard label="Failed today" value="—" icon={AlertCircle} tone="text-destructive" />
        <KpiCard label="Pending today" value="—" icon={Clock} tone="text-warning" />
        <KpiCard label="Activity" value="—" icon={Activity} tone="text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What's wired up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Phase 0 — scaffold, build tooling, theme + nav-layout switching</p>
          <p>• Phase 1 — auth, login, protected layout, role gating</p>
          <p>• Phase 2 — tenants list / detail / token / environment</p>
          <p>• Phase 3 — scenarios list, run, certify (filtered by activity)</p>
          <p className="pt-2 text-xs">Phases 4–6 ship next.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={`h-4 w-4 ${tone}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
