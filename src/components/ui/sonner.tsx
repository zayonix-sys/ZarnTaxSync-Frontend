import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

import { usePreferencesStore } from "@/stores/preferences";

export function Toaster(props: ToasterProps) {
  const theme = usePreferencesStore((s) => s.theme);
  return (
    <SonnerToaster
      theme={theme}
      richColors
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
