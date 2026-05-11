import { createFileRoute, redirect } from "@tanstack/react-router";

import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth/profile")({
  beforeLoad: () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) throw redirect({ to: "/login" });
    throw redirect({ to: "/users/$id", params: { id: user.id } });
  },
  component: () => null,
});
