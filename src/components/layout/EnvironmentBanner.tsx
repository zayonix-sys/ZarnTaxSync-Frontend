import { AlertTriangle } from "lucide-react";

import { useReportsTokenStatus } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

/**
 * Persistent environment banner across the top of the app, per the Phase 6
 * "UX polish" plan. Reads /reports/token-status; shows a yellow stripe in
 * Sandbox and an amber/red stripe when the FBR token is expiring or expired.
 *
 * Hidden when no backend response is available (e.g. guest mode without a
 * backend) so it doesn't add visual noise.
 */
export function EnvironmentBanner() {
  const { data } = useReportsTokenStatus();
  if (!data) return null;

  const expiresSoon = data.daysRemaining <= 30 && data.daysRemaining > 0;
  const expired = data.daysRemaining <= 0;
  const sandbox = data.environment === "Sandbox";

  if (!sandbox && !expiresSoon && !expired) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 text-xs md:px-6",
        expired
          ? "bg-destructive text-destructive-foreground"
          : expiresSoon
            ? "bg-warning text-warning-foreground"
            : "bg-warning/15 text-warning-foreground dark:text-foreground",
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {expired ? (
        <span>
          FBR token expired {Math.abs(data.daysRemaining)} day(s) ago — invoices
          will fail until a new token is uploaded.
        </span>
      ) : expiresSoon ? (
        <span>
          FBR token expires in {data.daysRemaining} day(s). Upload a new token
          on the Tenant page.
        </span>
      ) : (
        <span>
          Sandbox mode — invoices are not submitted to the live FBR API. Switch
          to Production on the tenant FBR Token tab when you're ready.
        </span>
      )}
    </div>
  );
}
