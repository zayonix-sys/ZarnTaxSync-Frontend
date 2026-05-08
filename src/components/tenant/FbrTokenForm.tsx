import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { parseISO, format } from "date-fns";
import { z } from "zod";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
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
    control,
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

      <Textarea
        id="token"
        label={`${environment} token`}
        rows={4}
        autoComplete="off"
        spellCheck={false}
        className="font-mono text-xs"
        {...register("token")}
      />
        {errors.token && (
          <p className="text-xs text-destructive">{errors.token.message}</p>
        )}

      <Controller
        control={control}
        name="expiresAt"
        render={({ field }) => (
          <DatePicker
            id="expiresAt"
            label="Expires at"
            date={field.value ? parseISO(field.value) : undefined}
            onChange={(d) => field.onChange(d ? format(d, "yyyy-MM-dd") : "")}
          />
        )}
      />
        {errors.expiresAt && (
          <p className="text-xs text-destructive">{errors.expiresAt.message}</p>
        )}

      <Button type="submit" disabled={isSubmitting || mutation.isPending}>
        {mutation.isPending ? "Saving..." : `Save ${environment} token`}
      </Button>
    </form>
  );
}
