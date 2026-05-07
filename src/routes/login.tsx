import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Loader2, Lock, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

import { login } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuthStore } from "@/stores/auth";
import { normalizeError } from "@/api/client";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type LoginValues = z.infer<typeof LoginSchema>;

const SearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
  validateSearch: SearchSchema,
  beforeLoad: () => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const setSession = useAuthStore((s) => s.setSession);
  // TODO(guest-login): remove `loginAsGuest` once backend auth is the only path.
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // TODO(guest-login): remove this handler and its button below.
  const onGuestLogin = () => {
    loginAsGuest();
    toast.success("Signed in as Guest");
    navigate({ to: search.redirect ?? "/dashboard", replace: true });
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const auth = await login(values);
      setSession(auth);
      toast.success(`Welcome back, ${auth.user.firstName}`);
      const target = search.redirect ?? "/dashboard";
      navigate({ to: target, replace: true });
    } catch (err) {
      const norm = normalizeError(err);
      if (norm.status === 429) {
        // Show countdown, derived from Retry-After (already toasted in client.ts).
        setRetryAfter(60);
        const id = setInterval(() => {
          setRetryAfter((r) => (r && r > 1 ? r - 1 : null));
        }, 1000);
        setTimeout(() => clearInterval(id), 60_000);
        return;
      }
      setFormError(norm.errors[0] ?? norm.message);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Brand panel */}
      <div className="relative hidden bg-primary/5 lg:flex lg:items-center lg:justify-center">
        <div className="max-w-md p-12">
          <Logo />
          <h1 className="mt-10 text-3xl font-semibold tracking-tight">
            FBR-compliant invoicing,
            <br />
            done right.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Submit Sale and Debit Note invoices to FBR's Digital Invoicing API,
            track sandbox certification, manage tenants and branches — all in
            one minimal, fast workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li>• Real-time IRN allocation</li>
            <li>• 28 PRAL sandbox scenarios</li>
            <li>• Idempotent retries & audit trail</li>
            <li>• Production / Sandbox environment switch</li>
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Card className="mt-6 border-none shadow-none lg:border lg:shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Enter your email and password to access your tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="pl-9"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <PasswordInput
                      id="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="pl-9"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || retryAfter !== null}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </>
                  ) : retryAfter !== null ? (
                    `Try again in ${retryAfter}s`
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              {/* TODO(guest-login): remove this entire block once backend auth
                  is the only entry point. Lets us browse the protected shell
                  without a backend during Phases 4–6 development. */}
              <div className="mt-6">
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    or
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={onGuestLogin}
                >
                  <UserRound className="h-4 w-4" />
                  Continue as guest
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Dev only — no backend calls. Removed before release.
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Register your company
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            ZarnTaxSync · FBR Digital Invoicing
          </p>
        </div>
      </div>
    </div>
  );
}
