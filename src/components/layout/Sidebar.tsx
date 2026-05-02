import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { filterNavByRole, NAV_ITEMS } from "@/components/layout/navigation";

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const collapsed = usePreferencesStore((s) => s.sidebarCollapsed);
  const toggleSidebar = usePreferencesStore((s) => s.toggleSidebar);
  const { location } = useRouterState();
  const items = filterNavByRole(NAV_ITEMS, role);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
      aria-label="Primary navigation"
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  disabled={item.comingSoon}
                  aria-disabled={item.comingSoon || undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    item.comingSoon && "opacity-60",
                    collapsed && "justify-center px-2",
                  )}
                  title={collapsed ? item.label : undefined}
                  onClick={(e) => {
                    if (item.comingSoon) e.preventDefault();
                  }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.comingSoon && (
                        <Badge variant="secondary" className="text-[10px]">
                          Soon
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center text-muted-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
