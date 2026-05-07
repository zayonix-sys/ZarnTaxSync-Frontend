import type { Role } from "@/api/types";

const ROLE_LABELS: Record<Role, string> = {
  SuperAdmin: "Super Admin",
  TenantAdmin: "Tenant Admin",
  BranchManager: "Branch Manager",
  Operator: "Operator",
  Viewer: "Viewer",
};

export function formatRoleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

