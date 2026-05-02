import { CheckCircle2, AlertCircle, AlertTriangle, KeyRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenStatus } from "@/hooks/useTenants";
import { formatDate } from "@/lib/format";

interface TokenStatusCardProps {
  tenantId: string;
}

export function TokenStatusCard({ tenantId }: TokenStatusCardProps) {
  const { data, isLoading, isError } = useTokenStatus(tenantId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          FBR Token Status
        </CardTitle>
        {data && <EnvBadge env={data.environment} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        ) : isError ? (
          <div className="text-sm text-muted-foreground">
            No token uploaded yet.
          </div>
        ) : data ? (
          <div className="flex flex-col gap-1.5">
            <StatusRow daysRemaining={data.daysRemaining} />
            <p className="text-xs text-muted-foreground">
              Expires {formatDate(data.expiresAt)}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EnvBadge({ env }: { env: "Sandbox" | "Production" }) {
  if (env === "Sandbox") {
    return <Badge variant="warning">Sandbox</Badge>;
  }
  return <Badge variant="success">Production</Badge>;
}

function StatusRow({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining <= 0) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="text-base font-semibold">Expired</span>
      </div>
    );
  }
  if (daysRemaining <= 30) {
    return (
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-base font-semibold">
          {daysRemaining} days remaining
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-success">
      <CheckCircle2 className="h-4 w-4" />
      <span className="text-base font-semibold">
        {daysRemaining} days remaining
      </span>
    </div>
  );
}
