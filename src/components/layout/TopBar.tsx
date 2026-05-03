import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronRight, LogOut, UserCircle } from "lucide-react";

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
import { Logo } from "@/components/common/Logo";
import { revokeToken } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { cn } from "@/lib/utils";
import { filterNavByRole, NAV_ITEMS } from "@/components/layout/navigation";

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
  const { location } = useRouterState();
  const navItems = filterNavByRole(NAV_ITEMS, user?.role);

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      {navLayout === "topbar" && <Logo />}

      {showNav ? (
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
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
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  item.comingSoon && "opacity-60",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav
          aria-label="Breadcrumb"
          className="hidden flex-1 items-center gap-1.5 text-sm text-muted-foreground md:flex"
        >
          <Link to="/dashboard" className="hover:text-foreground">
            Home
          </Link>
          {segments.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              <span className={cn(i === segments.length - 1 && "text-foreground")}>
                {s.replace(/-/g, " ")}
              </span>
            </span>
          ))}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* TODO(guest-login): remove the guest badge alongside the rest of guest mode. */}
        {isGuest && (
          <Badge variant="warning" className="mr-1 hidden sm:inline-flex">
            Guest mode
          </Badge>
        )}
        <NavLayoutToggle />
        <ThemeToggle />

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
    </header>
  );
}
