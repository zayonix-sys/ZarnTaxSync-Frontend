import {
  LayoutDashboard,
  FileText,
  Users,
  Boxes,
  BarChart3,
  Plug,
  Settings,
  ScrollText,
  Building2,
  CheckSquare,
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
  /** Phase number where this route ships. Lets us mark not-yet-built items in dev. */
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  /** Set to true for routes not yet implemented (renders disabled with badge). */
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, phase: 4, comingSoon: true },
  { label: "Invoices", to: "/invoices", icon: FileText, phase: 4, comingSoon: true },
  { label: "Tenants", to: "/tenants", icon: Building2, minRole: "SuperAdmin", phase: 2 },
  { label: "Scenarios", to: "/scenarios", icon: CheckSquare, phase: 3 },
  { label: "Customers", to: "/customers", icon: Users, phase: 5, comingSoon: true },
  { label: "Products", to: "/products", icon: Boxes, phase: 6, comingSoon: true },
  { label: "Reports", to: "/reports", icon: BarChart3, phase: 6, comingSoon: true },
  { label: "Integration", to: "/integration", icon: Plug, minRole: "TenantAdmin", phase: 5, comingSoon: true },
  { label: "Users", to: "/users", icon: Users, minRole: "TenantAdmin", phase: 5, comingSoon: true },
  { label: "Audit Logs", to: "/audit-logs", icon: ScrollText, minRole: "BranchManager", phase: 6, comingSoon: true },
  { label: "Settings", to: "/profile/change-password", icon: Settings, phase: 6, comingSoon: true },
];

export function filterNavByRole(items: NavItem[], role: Role | undefined): NavItem[] {
  if (!role) return [];
  return items.filter(
    (item) => !item.minRole || ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[item.minRole],
  );
}
