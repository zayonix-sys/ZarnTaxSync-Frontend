import { Outlet } from "@tanstack/react-router";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { usePreferencesStore } from "@/stores/preferences";

/**
 * Switches between sidebar layout and topbar layout based on user preference.
 * Sidebar layout: vertical sidebar + top breadcrumb bar.
 * Topbar layout:  full-width top navigation, no sidebar.
 */
export function AppShell() {
  const navLayout = usePreferencesStore((s) => s.navLayout);

  if (navLayout === "topbar") {
    return (
      <div className="flex min-h-screen flex-col">
        <TopBar showNav />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
