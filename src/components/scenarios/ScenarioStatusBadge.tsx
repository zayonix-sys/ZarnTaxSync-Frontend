import { Badge } from "@/components/ui/badge";
import type { ScenarioStatus } from "@/api/types";

const VARIANT: Record<ScenarioStatus, { variant: "success" | "destructive" | "secondary"; label: string }> = {
  Passed: { variant: "success", label: "Passed" },
  Failed: { variant: "destructive", label: "Failed" },
  Pending: { variant: "secondary", label: "Pending" },
};

export function ScenarioStatusBadge({ status }: { status: ScenarioStatus }) {
  const conf = VARIANT[status] ?? VARIANT.Pending;
  return <Badge variant={conf.variant}>{conf.label}</Badge>;
}
