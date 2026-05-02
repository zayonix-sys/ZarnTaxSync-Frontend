import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useSetProductionToken,
  useSetSandboxToken,
} from "@/hooks/useTenants";

const TokenSchema = z.object({
  token: z.string().min(10, "Token is required"),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-MM-dd"),
});

type TokenFormValues = z.infer<typeof TokenSchema>;

interface FbrTokenFormProps {
  tenantId: string;
  environment: "Sandbox" | "Production";
}

export function FbrTokenForm({ tenantId, environment }: FbrTokenFormProps) {
  const sandboxMutation = useSetSandboxToken(tenantId);
  const productionMutation = useSetProductionToken(tenantId);

  const mutation = environment === "Sandbox" ? sandboxMutation : productionMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TokenFormValues>({
    resolver: zodResolver(TokenSchema),
    defaultValues: { token: "", expiresAt: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {environment === "Production" && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Production token</AlertTitle>
          <AlertDescription>
            You are about to save a Production FBR token. This will affect live
            invoice submissions.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="token">{environment} token</Label>
        <Textarea
          id="token"
          rows={4}
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste the PRAL bearer token here"
          className="font-mono text-xs"
          {...register("token")}
        />
        {errors.token && (
          <p className="text-xs text-destructive">{errors.token.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiresAt">Expires at</Label>
        <Input id="expiresAt" type="date" {...register("expiresAt")} />
        {errors.expiresAt && (
          <p className="text-xs text-destructive">{errors.expiresAt.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting || mutation.isPending}>
        {mutation.isPending ? "Saving..." : `Save ${environment} token`}
      </Button>
    </form>
  );
}
