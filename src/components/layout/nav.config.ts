import {
  BadgeCheck,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  PlugZap,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { Role } from "@/api/types";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Roles that may see this entry. If omitted, every authenticated user sees it. */
  roles?: Role[];
  /** Visual hint that the route is not implemented yet. */
  comingSoon?: boolean;
  /** Optional grouping label to render above the item. */
  group?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText, comingSoon: true },
  {
    to: "/scenarios",
    label: "FBR Scenarios",
    icon: ShieldCheck,
    roles: ["SuperAdmin", "TenantAdmin", "BranchManager"],
  },

  {
    group: "Master Data",
    to: "/customers",
    label: "Customers",
    icon: BadgeCheck,
    comingSoon: true,
  },
  { to: "/products", label: "Products / Items", icon: Package, comingSoon: true },

  {
    group: "Administration",
    to: "/tenants",
    label: "Tenants",
    icon: Building2,
    roles: ["SuperAdmin"],
  },
  {
    to: "/users",
    label: "Users",
    icon: Users,
    comingSoon: true,
    roles: ["SuperAdmin", "TenantAdmin", "BranchManager"],
  },
  {
    to: "/integration",
    label: "FBR Integration",
    icon: PlugZap,
    comingSoon: true,
    roles: ["SuperAdmin", "TenantAdmin"],
  },

  {
    group: "Insights",
    to: "/reports",
    label: "Reports",
    icon: ClipboardList,
    comingSoon: true,
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: ScrollText,
    comingSoon: true,
    roles: ["SuperAdmin", "TenantAdmin", "BranchManager"],
  },

  { group: "System", to: "/settings", label: "Settings", icon: Settings },
];
