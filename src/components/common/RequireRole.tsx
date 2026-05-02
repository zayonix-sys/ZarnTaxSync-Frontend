import { Lock } from "lucide-react";

import { ROLE_HIERARCHY, type Role } from "@/api/types";
import { useAuthStore } from "@/stores/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RequireRoleProps {
  /** Minimum role required to render `children`. */
  min: Role;
  /** Optional override roles (any-of). When set, `min` is ignored. */
  anyOf?: Role[];
  children: React.ReactNode;
  /** Element rendered instead of `children` when access is denied.
   *  Default: a small lock icon with explanatory tooltip. */
  fallback?: React.ReactNode | null;
  /** When true, returns null instead of the fallback (silent hide). */
  hideOnDeny?: boolean;
}

/**
 * Gates UI by role. Examples:
 *   <RequireRole min="TenantAdmin"><Button>...</Button></RequireRole>
 *   <RequireRole anyOf={["SuperAdmin","TenantAdmin"]} hideOnDeny>...</RequireRole>
 */
export function RequireRole({
  min,
  anyOf,
  children,
  fallback,
  hideOnDeny,
}: RequireRoleProps) {
  const role = useAuthStore((s) => s.user?.role);

  let allowed = false;
  if (role) {
    allowed = anyOf
      ? anyOf.includes(role)
      : ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[min];
  }

  if (allowed) return <>{children}</>;
  if (hideOnDeny) return null;
  if (fallback !== undefined) return <>{fallback}</>;

  const required = anyOf?.join(" or ") ?? min;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Requires {required}
        </span>
      </TooltipTrigger>
      <TooltipContent>You don't have permission for this action.</TooltipContent>
    </Tooltip>
  );
}
