import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import { Logo } from "@/components/common/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { filterNavByRole, getToneClasses, NAV_ITEMS } from "@/components/layout/navigation";

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const collapsed = usePreferencesStore((s) => s.sidebarCollapsed);
  const toggleSidebar = usePreferencesStore((s) => s.toggleSidebar);
  const iconTheme = usePreferencesStore((s) => s.iconTheme);
  const navDensity = usePreferencesStore((s) => s.navDensity);
  const pinnedNav = usePreferencesStore((s) => s.pinnedNav);
  const togglePinnedNav = usePreferencesStore((s) => s.togglePinnedNav);
  const { location } = useRouterState();
  const items = filterNavByRole(NAV_ITEMS, role);
  const dense = navDensity === "compact";
  const pinnedItems = items.filter((i) => pinnedNav.includes(i.to));
  const otherItems = items.filter((i) => !pinnedNav.includes(i.to));

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground shadow-soft transition-[width] duration-200",
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
          {!collapsed && pinnedItems.length > 0 && (
            <li className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              Pinned
            </li>
          )}

          {(collapsed ? items : pinnedItems).map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            const tone = getToneClasses(item.tone);
            const isPinned = pinnedNav.includes(item.to);
            const iconBox = cn(
              "grid shrink-0 place-items-center rounded-lg transition-all",
              dense ? "h-8 w-8" : "h-9 w-9",
              iconTheme === "mono" &&
                cn(
                  "text-muted-foreground group-hover:text-foreground",
                  active && "text-primary",
                ),
              iconTheme === "color" && cn(tone.soft, active && "ring-1 ring-primary/10"),
              iconTheme === "gradient" && cn(tone.gradient, active && "ring-1 ring-white/10"),
            );
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  disabled={item.comingSoon}
                  aria-disabled={item.comingSoon || undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
                    dense ? "py-1.5" : "py-2",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    item.comingSoon && "opacity-60",
                    collapsed && "justify-center px-2",
                  )}
                  title={collapsed ? item.label : undefined}
                  onClick={(e) => {
                    if (item.comingSoon) e.preventDefault();
                  }}
                >
                  <span className={iconBox}>
                    <Icon className={cn(dense ? "h-4 w-4" : "h-[18px] w-[18px]")} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      <button
                        type="button"
                        aria-label={isPinned ? "Unpin" : "Pin"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePinnedNav(item.to);
                        }}
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      >
                        <Star className={cn("h-4 w-4", isPinned && "fill-current")} />
                      </button>
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

          {!collapsed && pinnedItems.length > 0 && otherItems.length > 0 && (
            <li className="my-2 border-t border-sidebar-border" />
          )}

          {!collapsed &&
            otherItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              const tone = getToneClasses(item.tone);
              const isPinned = pinnedNav.includes(item.to);
              const iconBox = cn(
                "grid shrink-0 place-items-center rounded-lg transition-all",
                dense ? "h-8 w-8" : "h-9 w-9",
                iconTheme === "mono" &&
                  cn(
                    "text-muted-foreground group-hover:text-foreground",
                    active && "text-primary",
                  ),
                iconTheme === "color" && cn(tone.soft, active && "ring-1 ring-primary/10"),
                iconTheme === "gradient" && cn(tone.gradient, active && "ring-1 ring-white/10"),
              );
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    disabled={item.comingSoon}
                    aria-disabled={item.comingSoon || undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-colors",
                      dense ? "py-1.5" : "py-2",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      item.comingSoon && "opacity-60",
                    )}
                    onClick={(e) => {
                      if (item.comingSoon) e.preventDefault();
                    }}
                  >
                    <span className={iconBox}>
                      <Icon className={cn(dense ? "h-4 w-4" : "h-[18px] w-[18px]")} />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    <button
                      type="button"
                      aria-label={isPinned ? "Unpin" : "Pin"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePinnedNav(item.to);
                      }}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    {item.comingSoon && (
                      <Badge variant="secondary" className="text-[10px]">
                        Soon
                      </Badge>
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
