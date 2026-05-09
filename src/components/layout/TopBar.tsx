import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, LogOut, Menu, UserCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NavLayoutToggle } from "@/components/common/NavLayoutToggle";
import { ThemeCustomizer } from "@/components/common/ThemeCustomizer";
import { CommandPalette } from "@/components/common/CommandPalette";
import { BrandLogo } from "@/components/common/BrandLogo";
import { revokeToken } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { cn } from "@/lib/utils";
import { filterNavByRole, getToneClasses, NAV_ITEMS } from "@/components/layout/navigation";

interface TopBarProps {
  /** When true, render the navigation links inline (used in `topbar` layout). */
  showNav?: boolean;
}

export function TopBar({ showNav = false }: TopBarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshTokenValue = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  // TODO(guest-login): remove `isGuest` and the badge / logout short-circuit below.
  const isGuest = useAuthStore((s) => s.isGuest);
  const navLayout = usePreferencesStore((s) => s.navLayout);
  const iconTheme = usePreferencesStore((s) => s.iconTheme);
  const navDensity = usePreferencesStore((s) => s.navDensity);
  const { location } = useRouterState();
  const navItems = filterNavByRole(NAV_ITEMS, user?.role);
  const dense = navDensity === "compact";

  const initials = (user?.fullName || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onLogout = async () => {
    // TODO(guest-login): drop the `!isGuest` guard once guest mode is removed.
    if (!isGuest) {
      try {
        if (refreshTokenValue) await revokeToken(refreshTokenValue);
      } catch {
        // ignore — we want to clear locally regardless
      }
    }
    clear();
    navigate({ to: "/login" });
  };

  // Build breadcrumb from the URL.
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 shadow-soft backdrop-blur-md">
      <div className="w-full">
        <div className="flex h-12 items-center gap-3 px-4 md:px-6">
          <div className="min-w-0 flex-1">
            {navLayout === "topbar" ? (
              <Link to="/dashboard" className="inline-flex shrink-0">
                <BrandLogo size="sm" />
              </Link>
            ) : (
              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Link to="/dashboard" className="shrink-0 hover:text-foreground">
                  Home
                </Link>
                {segments.map((s, i) => (
                  <span key={i} className="flex min-w-0 items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    <span
                      className={cn(
                        "truncate",
                        i === segments.length - 1 && "text-foreground",
                      )}
                    >
                      {s.replace(/-/g, " ")}
                    </span>
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isGuest && (
              <Badge variant="warning" className="mr-1 hidden sm:inline-flex">
                Guest mode
              </Badge>
            )}

            <NavLayoutToggle />
            <CommandPalette />
            <ThemeToggle />
            <ThemeCustomizer />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="ml-1 h-9 gap-2 px-2"
                  aria-label="Account menu"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden flex-col items-start text-left leading-tight sm:flex">
                    <span className="text-sm font-medium">
                      {user?.fullName ?? user?.email ?? "User"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {user?.role ?? "—"}
                    </span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.fullName}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate({ to: "/profile/change-password" })}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {showNav && (
          <div className="border-t px-4 md:px-6">
            <div className="flex h-12 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2 md:hidden">
                    <Menu className="h-4 w-4" />
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.to}
                        disabled={item.comingSoon}
                        onSelect={(e) => {
                          if (item.comingSoon) {
                            e.preventDefault();
                            return;
                          }
                          navigate({ to: item.to });
                        }}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <nav className="no-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.to);
                  const tone = getToneClasses(item.tone);
                  const iconBox = cn(
                    "grid place-items-center rounded-lg transition-all",
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
                    <Link
                      key={item.to}
                      to={item.to}
                      disabled={item.comingSoon}
                      aria-disabled={item.comingSoon || undefined}
                      onClick={(e) => {
                        if (item.comingSoon) e.preventDefault();
                      }}
                      className={cn(
                        "group relative inline-flex items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors",
                        dense ? "h-9" : "h-10",
                        active
                          ? "bg-secondary text-foreground shadow-sm after:absolute after:inset-x-2.5 after:bottom-1 after:h-[2px] after:rounded-full after:bg-primary/70"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        item.comingSoon && "opacity-60",
                      )}
                    >
                      <span className={iconBox}>
                        <Icon className={cn(dense ? "h-4 w-4" : "h-[18px] w-[18px]")} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
