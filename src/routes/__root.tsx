import {
  createRootRouteWithContext,
  Outlet,
  ScrollRestoration,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { QueryClient } from "@tanstack/react-query";

import { ThemeProvider } from "@/components/common/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={150}>
        <Outlet />
        <ScrollRestoration />
        <Toaster />
        {import.meta.env.DEV && (
          <>
            <TanStackRouterDevtools position="bottom-right" />
            <ReactQueryDevtools buttonPosition="bottom-left" />
          </>
        )}
      </TooltipProvider>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
