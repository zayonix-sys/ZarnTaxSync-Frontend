import { useEffect } from "react";

import { syncThemeToDocument, usePreferencesStore } from "@/stores/preferences";

/**
 * Listens to theme preference changes and to the OS color-scheme media query
 * (when theme === "system"), and keeps the `<html>` `dark` class + color-scheme
 * in sync. Pre-paint init lives in index.html to prevent FOUC.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = usePreferencesStore((s) => s.theme);

  useEffect(() => {
    syncThemeToDocument(theme);
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => syncThemeToDocument("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return <>{children}</>;
}
