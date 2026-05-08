import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { PasswordInput } from "@/components/ui/password-input";
import { changePassword, revokeToken } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { normalizeError } from "@/api/client";

export const Route = createFileRoute("/_auth/profile/change-password")({
  component: ChangePasswordPage,
});

const Schema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/\d/, "Include a digit"),
    confirmNewPassword: z.string().min(1, "Required"),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match",
  });
type Values = z.infer<typeof Schema>;

function ChangePasswordPage() {
  const navigate = useNavigate();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isGuest = useAuthStore((s) => s.isGuest);
  const clear = useAuthStore((s) => s.clear);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const change = useMutation({
    mutationFn: (body: Values) =>
      changePassword({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        confirmNewPassword: body.confirmNewPassword,
      }),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (isGuest) {
      toast.info("Guest mode — no real password to change");
      return;
    }
    try {
      await change.mutateAsync(values);
      toast.success("Password changed — signing you out");
      try {
        if (refreshToken) await revokeToken(refreshToken);
      } catch {
        // ignore — we're clearing locally regardless
      }
      clear();
      navigate({ to: "/login" });
    } catch (err) {
      const norm = normalizeError(err);
      const fieldMsg = norm.errors[0] ?? norm.message;
      setError("currentPassword", { message: fieldMsg });
    }
  });

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change password
          </CardTitle>
          <CardDescription>
            You'll be signed out of all sessions on success.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGuest && (
            <Alert variant="warning" className="mb-4">
              <AlertTitle>Guest mode</AlertTitle>
              <AlertDescription>
                Guest sessions don't have a real password. Sign in with a real
                account to change your password.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <PasswordInput
                id="currentPassword"
                label="Current password"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <PasswordInput
                id="newPassword"
                label="New password"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <PasswordInput
                id="confirmNewPassword"
                label="Confirm new password"
                autoComplete="new-password"
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmNewPassword.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || change.isPending || isGuest}
            >
              {(isSubmitting || change.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
