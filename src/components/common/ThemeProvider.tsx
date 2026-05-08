import { useEffect } from "react";

import { syncThemeToDocument, syncUiToDocument, usePreferencesStore } from "@/stores/preferences";

/**
 * Listens to theme preference changes and to the OS color-scheme media query
 * (when theme === "system"), and keeps the `<html>` `dark` class + color-scheme
 * in sync. Pre-paint init lives in index.html to prevent FOUC.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePreferencesStore((s) => s.theme);
  const accentPreset = usePreferencesStore((s) => s.accentPreset);
  const iconTheme = usePreferencesStore((s) => s.iconTheme);
  const radiusPreset = usePreferencesStore((s) => s.radiusPreset);
  const fontPreset = usePreferencesStore((s) => s.fontPreset);

  useEffect(() => {
    syncThemeToDocument(theme);
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => syncThemeToDocument("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    syncUiToDocument({ accentPreset, iconTheme, radiusPreset, fontPreset });
  }, [theme, accentPreset, iconTheme, radiusPreset, fontPreset]);

  return <>{children}</>;
}
