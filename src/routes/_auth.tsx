import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ location }) => {
    const { accessToken, user } = useAuthStore.getState();
    if (!accessToken || !user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppShell,
});
