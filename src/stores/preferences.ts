import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { env, type NavLayout } from "@/lib/env";

export type Theme = "light" | "dark" | "system";

interface PreferencesState {
  theme: Theme;
  navLayout: NavLayout;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setNavLayout: (layout: NavLayout) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      navLayout: env.VITE_DEFAULT_NAV_LAYOUT,
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setNavLayout: (navLayout) => set({ navLayout }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: "zts.preferences",
      storage: createJSONStorage(() => localStorage),
      // Theme key needs to match the inline script in index.html.
      partialize: (state) => ({
        theme: state.theme,
        navLayout: state.navLayout,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

/** Mirror the theme into a top-level localStorage key consumed by the
 *  pre-paint script in index.html (prevents flash of wrong theme on reload). */
export function syncThemeToDocument(theme: Theme) {
  try {
    localStorage.setItem("zts.theme", theme);
  } catch {
    /* ignore storage errors */
  }
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}
