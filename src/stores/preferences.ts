import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { env, type NavLayout } from "@/lib/env";

export type Theme = "light" | "dark" | "system";
export type AccentPreset = "blue" | "emerald" | "violet" | "amber" | "rose";
export type IconTheme = "mono" | "color" | "gradient";
export type RadiusPreset = "sm" | "md" | "lg";
export type NavDensity = "compact" | "comfortable";
export type FontPreset =
  | "noto"
  | "jakarta"
  | "dm"
  | "manrope"
  | "rubik"
  | "outfit"
  | "sora"
  | "work";

interface PreferencesState {
  theme: Theme;
  navLayout: NavLayout;
  sidebarCollapsed: boolean;
  accentPreset: AccentPreset;
  iconTheme: IconTheme;
  radiusPreset: RadiusPreset;
  navDensity: NavDensity;
  fontPreset: FontPreset;
  pinnedNav: string[];
  setTheme: (theme: Theme) => void;
  setNavLayout: (layout: NavLayout) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAccentPreset: (preset: AccentPreset) => void;
  setIconTheme: (theme: IconTheme) => void;
  setRadiusPreset: (preset: RadiusPreset) => void;
  setNavDensity: (density: NavDensity) => void;
  setFontPreset: (preset: FontPreset) => void;
  togglePinnedNav: (to: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      navLayout: env.VITE_DEFAULT_NAV_LAYOUT,
      sidebarCollapsed: false,
      accentPreset: "blue",
      iconTheme: "color",
      radiusPreset: "md",
      navDensity: "comfortable",
      fontPreset: "noto",
      pinnedNav: [],
      setTheme: (theme) => set({ theme }),
      setNavLayout: (navLayout) => set({ navLayout }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setAccentPreset: (accentPreset) => set({ accentPreset }),
      setIconTheme: (iconTheme) => set({ iconTheme }),
      setRadiusPreset: (radiusPreset) => set({ radiusPreset }),
      setNavDensity: (navDensity) => set({ navDensity }),
      setFontPreset: (fontPreset) => set({ fontPreset }),
      togglePinnedNav: (to) =>
        set((s) =>
          s.pinnedNav.includes(to)
            ? { pinnedNav: s.pinnedNav.filter((x) => x !== to) }
            : { pinnedNav: [...s.pinnedNav, to] },
        ),
    }),
    {
      name: "zts.preferences",
      storage: createJSONStorage(() => localStorage),
      // Theme key needs to match the inline script in index.html.
      partialize: (state) => ({
        theme: state.theme,
        navLayout: state.navLayout,
        sidebarCollapsed: state.sidebarCollapsed,
        accentPreset: state.accentPreset,
        iconTheme: state.iconTheme,
        radiusPreset: state.radiusPreset,
        navDensity: state.navDensity,
        fontPreset: state.fontPreset,
        pinnedNav: state.pinnedNav,
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

const ACCENT_PRESETS: Record<
  AccentPreset,
  {
    primary: string;
    primaryDark: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarAccentDark: string;
    sidebarAccentForegroundDark: string;
  }
> = {
  blue: {
    primary: "221 83% 53%",
    primaryDark: "217 91% 60%",
    sidebarAccent: "221 83% 96%",
    sidebarAccentForeground: "221 83% 53%",
    sidebarAccentDark: "217 50% 18%",
    sidebarAccentForegroundDark: "217 91% 75%",
  },
  emerald: {
    primary: "142 71% 35%",
    primaryDark: "142 64% 45%",
    sidebarAccent: "142 54% 94%",
    sidebarAccentForeground: "142 71% 35%",
    sidebarAccentDark: "142 38% 18%",
    sidebarAccentForegroundDark: "142 64% 70%",
  },
  violet: {
    primary: "262 83% 58%",
    primaryDark: "262 90% 72%",
    sidebarAccent: "262 83% 96%",
    sidebarAccentForeground: "262 83% 58%",
    sidebarAccentDark: "262 40% 18%",
    sidebarAccentForegroundDark: "262 90% 78%",
  },
  amber: {
    primary: "38 92% 50%",
    primaryDark: "38 92% 55%",
    sidebarAccent: "38 92% 92%",
    sidebarAccentForeground: "38 92% 45%",
    sidebarAccentDark: "38 45% 18%",
    sidebarAccentForegroundDark: "38 92% 75%",
  },
  rose: {
    primary: "346 77% 50%",
    primaryDark: "346 82% 65%",
    sidebarAccent: "346 77% 95%",
    sidebarAccentForeground: "346 77% 50%",
    sidebarAccentDark: "346 40% 18%",
    sidebarAccentForegroundDark: "346 82% 78%",
  },
};

const RADIUS_PRESETS: Record<RadiusPreset, string> = {
  sm: "0.4rem",
  md: "0.5rem",
  lg: "0.75rem",
};

const FONT_PRESETS: Record<FontPreset, string> = {
  noto: '"Noto Sans"',
  jakarta: '"Plus Jakarta Sans"',
  dm: '"DM Sans"',
  manrope: '"Manrope"',
  rubik: '"Rubik"',
  outfit: '"Outfit"',
  sora: '"Sora"',
  work: '"Work Sans"',
};

export function syncUiToDocument({
  accentPreset,
  iconTheme,
  radiusPreset,
  fontPreset,
}: Pick<PreferencesState, "accentPreset" | "iconTheme" | "radiusPreset" | "fontPreset">) {
  const preset = ACCENT_PRESETS[accentPreset] ?? ACCENT_PRESETS.blue;
  const isDark = document.documentElement.classList.contains("dark");
  const primary = isDark ? preset.primaryDark : preset.primary;
  const sidebarAccent = isDark ? preset.sidebarAccentDark : preset.sidebarAccent;
  const sidebarAccentForeground = isDark
    ? preset.sidebarAccentForegroundDark
    : preset.sidebarAccentForeground;

  document.documentElement.style.setProperty(
    "--font-sans",
    FONT_PRESETS[fontPreset] ?? FONT_PRESETS.noto,
  );
  document.documentElement.style.setProperty("--primary", primary);
  document.documentElement.style.setProperty("--ring", primary);
  document.documentElement.style.setProperty("--sidebar-accent", sidebarAccent);
  document.documentElement.style.setProperty("--sidebar-accent-foreground", sidebarAccentForeground);
  document.documentElement.style.setProperty(
    "--radius",
    RADIUS_PRESETS[radiusPreset] ?? RADIUS_PRESETS.md,
  );
  document.documentElement.dataset.iconTheme = iconTheme;
}
