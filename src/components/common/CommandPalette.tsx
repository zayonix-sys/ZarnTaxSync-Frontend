import * as React from "react";
import { Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { filterNavByRole, NAV_ITEMS } from "@/components/layout/navigation";

type CommandItem =
  | {
      type: "nav";
      key: string;
      label: string;
      hint?: string;
      icon: React.ComponentType<{ className?: string }>;
      run: () => void;
    }
  | {
      type: "action";
      key: string;
      label: string;
      hint?: string;
      icon: React.ComponentType<{ className?: string }>;
      run: () => void;
    };

export function CommandPalette() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const theme = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const toggleSidebar = usePreferencesStore((s) => s.toggleSidebar);
  const navLayout = usePreferencesStore((s) => s.navLayout);
  const setNavLayout = usePreferencesStore((s) => s.setNavLayout);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const navItems = React.useMemo(() => filterNavByRole(NAV_ITEMS, role), [role]);

  const commands = React.useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = navItems.map((item) => ({
      type: "nav",
      key: item.to,
      label: item.label,
      hint: item.to,
      icon: item.icon,
      run: () => navigate({ to: item.to }),
    }));

    const actions: CommandItem[] = [
      {
        type: "action",
        key: "toggle-sidebar",
        label: "Toggle sidebar collapse",
        hint: "Layout",
        icon: Search,
        run: () => toggleSidebar(),
      },
      {
        type: "action",
        key: "toggle-nav-layout",
        label: navLayout === "sidebar" ? "Switch to topbar layout" : "Switch to sidebar layout",
        hint: "Layout",
        icon: Search,
        run: () => setNavLayout(navLayout === "sidebar" ? "topbar" : "sidebar"),
      },
      {
        type: "action",
        key: "cycle-theme",
        label: "Cycle theme (Light → Dark → System)",
        hint: `Current: ${theme}`,
        icon: Search,
        run: () => {
          const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
          setTheme(next);
        },
      },
    ];

    return [...nav, ...actions];
  }, [navigate, navItems, navLayout, setNavLayout, setTheme, theme, toggleSidebar]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.hint ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commands, query]);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      const isSlash = e.key === "/";
      const isMod = e.ctrlKey || e.metaKey;

      if ((isMod && isK) || (isSlash && !open)) {
        e.preventDefault();
        setOpen(true);
      }

      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const onRun = (item: CommandItem | undefined) => {
    if (!item) return;
    item.run();
    close();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex"
      >
        <Search className="h-[1.1rem] w-[1.1rem]" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    onRun(filtered[activeIndex]);
                  }
                }}
                placeholder="Type to search… (Ctrl/Cmd+K)"
                className={cn(
                  "w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                )}
              />
            </div>

            <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No results.
                </div>
              ) : (
                <ul className="p-1">
                  {filtered.map((item, idx) => {
                    const Icon = item.icon;
                    const active = idx === activeIndex;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => onRun(item)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                            active ? "bg-accent text-foreground" : "text-foreground hover:bg-accent",
                          )}
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{item.label}</span>
                            {item.hint && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.hint}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.type === "nav" ? "Go" : "Run"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

