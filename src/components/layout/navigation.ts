import {
  BarChart3,
  Boxes,
  Building,
  Building2,
  CheckSquare,
  FileText,
  KeyRound,
  LayoutDashboard,
  Plug,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/api/types";
import { ROLE_HIERARCHY } from "@/api/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Minimum role required (inclusive). Falsy = visible to all authenticated users. */
  minRole?: Role;
  /** Phase number where this route ships. */
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  /** True for routes not yet implemented (renders disabled with badge). */
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, phase: 4 },
  { label: "Invoices", to: "/invoices", icon: FileText, phase: 4 },
  { label: "Scenarios", to: "/scenarios", icon: CheckSquare, phase: 3 },

  { label: "Tenants", to: "/tenants", icon: Building2, minRole: "SuperAdmin", phase: 2 },
  { label: "Branches", to: "/branches", icon: Building, minRole: "BranchManager", phase: 5 },
  { label: "Users", to: "/users", icon: Users, minRole: "BranchManager", phase: 5 },
  { label: "Integration", to: "/integration", icon: Plug, minRole: "TenantAdmin", phase: 5 },

  { label: "Products", to: "/products", icon: Boxes, phase: 6 },
  { label: "Reports", to: "/reports", icon: BarChart3, phase: 6 },
  { label: "Audit Logs", to: "/audit-logs", icon: ScrollText, minRole: "BranchManager", phase: 6 },

  { label: "Change Password", to: "/profile/change-password", icon: KeyRound, phase: 6 },
];

export function filterNavByRole(items: NavItem[], role: Role | undefined): NavItem[] {
  if (!role) return [];
  return items.filter(
    (item) => !item.minRole || ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[item.minRole],
  );
}
