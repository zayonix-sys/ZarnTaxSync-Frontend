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

export type NavTone =
  | "sky"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "cyan"
  | "indigo"
  | "lime";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  tone: NavTone;
  /** Minimum role required (inclusive). Falsy = visible to all authenticated users. */
  minRole?: Role;
  /** Phase number where this route ships. */
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  /** True for routes not yet implemented (renders disabled with badge). */
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, tone: "sky", phase: 4 },
  { label: "Invoices", to: "/invoices", icon: FileText, tone: "indigo", phase: 4 },
  { label: "Scenarios", to: "/scenarios", icon: CheckSquare, tone: "emerald", phase: 3 },

  {
    label: "Tenants",
    to: "/tenants",
    icon: Building2,
    tone: "violet",
    minRole: "SuperAdmin",
    phase: 2,
  },
  {
    label: "Branches",
    to: "/branches",
    icon: Building,
    tone: "amber",
    minRole: "BranchManager",
    phase: 5,
  },
  { label: "Users", to: "/users", icon: Users, tone: "cyan", minRole: "BranchManager", phase: 5 },
  {
    label: "Integration",
    to: "/integration",
    icon: Plug,
    tone: "lime",
    minRole: "TenantAdmin",
    phase: 5,
  },

  { label: "Products", to: "/products", icon: Boxes, tone: "rose", phase: 6 },
  { label: "Reports", to: "/reports", icon: BarChart3, tone: "sky", phase: 6 },
  {
    label: "Audit Logs",
    to: "/audit-logs",
    icon: ScrollText,
    tone: "violet",
    minRole: "BranchManager",
    phase: 6,
  },

  {
    label: "Change Password",
    to: "/profile/change-password",
    icon: KeyRound,
    tone: "indigo",
    phase: 6,
  },
];

export function filterNavByRole(items: NavItem[], role: Role | undefined): NavItem[] {
  if (!role) return [];
  return items.filter(
    (item) => !item.minRole || ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[item.minRole],
  );
}

export function getToneClasses(tone: NavTone) {
  switch (tone) {
    case "sky":
      return {
        soft: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
        solid: "bg-sky-500 text-white",
        gradient:
          "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_6px_16px_rgba(56,189,248,0.22)]",
      };
    case "emerald":
      return {
        soft: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
        solid: "bg-emerald-600 text-white",
        gradient:
          "bg-gradient-to-br from-emerald-500 to-lime-500 text-white shadow-[0_6px_16px_rgba(16,185,129,0.22)]",
      };
    case "violet":
      return {
        soft: "bg-violet-500/15 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
        solid: "bg-violet-600 text-white",
        gradient:
          "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_6px_16px_rgba(139,92,246,0.22)]",
      };
    case "amber":
      return {
        soft: "bg-amber-500/20 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
        solid: "bg-amber-500 text-black",
        gradient:
          "bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_6px_16px_rgba(251,191,36,0.22)]",
      };
    case "rose":
      return {
        soft: "bg-rose-500/15 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
        solid: "bg-rose-600 text-white",
        gradient:
          "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-[0_6px_16px_rgba(244,63,94,0.22)]",
      };
    case "cyan":
      return {
        soft: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
        solid: "bg-cyan-600 text-white",
        gradient:
          "bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-[0_6px_16px_rgba(6,182,212,0.22)]",
      };
    case "indigo":
      return {
        soft: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
        solid: "bg-indigo-600 text-white",
        gradient:
          "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_6px_16px_rgba(99,102,241,0.22)]",
      };
    case "lime":
      return {
        soft: "bg-lime-500/18 text-lime-800 dark:bg-lime-400/14 dark:text-lime-300",
        solid: "bg-lime-500 text-black",
        gradient:
          "bg-gradient-to-br from-lime-400 to-emerald-500 text-black shadow-[0_6px_16px_rgba(163,230,53,0.22)]",
      };
    default:
      return {
        soft: "bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
        solid: "bg-sky-500 text-white",
        gradient:
          "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_6px_16px_rgba(56,189,248,0.22)]",
      };
  }
}
