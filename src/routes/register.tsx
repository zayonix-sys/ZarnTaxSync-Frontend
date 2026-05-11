import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Lock, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { onboardTenant } from "@/api/tenants";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuthStore } from "@/stores/auth";
import { normalizeError } from "@/api/client";
import type { PlanType } from "@/api/types";
import { Separator } from "@/components/ui/separator";

const NTN_OR_CNIC = /^\d{7}$|^\d{13}$/;

const RegisterSchema = z.object({
  name: z.string().min(2, "Business name is required").max(120),
  subdomain: z
    .string()
    .min(2, "Subdomain is required")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only"),
  ntnCnic: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => NTN_OR_CNIC.test(v),
      "Must be a 7-digit NTN or 13-digit CNIC",
    ),
  strn: z.string().max(17).optional(),
  planType: z
    .enum(["Standard", "Professional", "Enterprise"])
    .default("Standard"),
  adminFirstName: z.string().min(1, "First name is required").max(100),
  adminLastName: z.string().min(1, "Last name is required").max(100),
  adminEmail: z.string().email("Enter a valid email"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/\d/, "Must include a number")
    .regex(/[@$!%*?&\-_#^]/, "Must include a special character (@$!%*?&-_#^)"),
});

type RegisterValues = z.infer<typeof RegisterSchema>;

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) throw redirect({ to: "/dashboard" });
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: onboardTenant,
    onSuccess: () => {
      toast.success("Company registered! Sign in to get started.");
      navigate({ to: "/login", replace: true });
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      ntnCnic: "",
      strn: "",
      planType: "Standard",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  const planType = watch("planType");

  const formError = mutation.error
    ? (normalizeError(mutation.error).errors[0] ??
      normalizeError(mutation.error).message)
    : null;

  const onSubmit = handleSubmit(async (values) => {
    mutation.reset();
    await mutation.mutateAsync(values);
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
            Start your FBR invoicing
            <br />
            journey today.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Register your company, invite your team, and start submitting
            FBR-compliant invoices in minutes.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li>• Multi-branch support out of the box</li>
            <li>• Sandbox & production environments</li>
            <li>• Role-based access for your team</li>
            <li>• Full audit trail on every invoice</li>
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
              <CardTitle className="text-2xl">Register your company</CardTitle>
              <CardDescription>
                Create your account and get started with FBR invoicing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {/* Company details */}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Company details
                </div>

                <div className="space-y-1">
                  <Input
                    id="name"
                    label="Business name"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      label="Subdomain"
                      className="flex-1"
                      {...register("subdomain")}
                    />
                    <span className="whitespace-nowrap text-sm text-muted-foreground mt-4">
                      .zarntaxsync.com
                    </span>
                  </div>
                  {errors.subdomain && (
                    <p className="text-xs text-destructive">
                      {errors.subdomain.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    id="ntnCnic"
                    label="NTN / CNIC"
                    inputMode="numeric"
                    {...register("ntnCnic")}
                  />
                  {errors.ntnCnic && (
                    <p className="text-xs text-destructive">
                      {errors.ntnCnic.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Input
                    id="strn"
                    label="STRN (optional)"
                    placeholder="Sales Tax Registration Number"
                    {...register("strn")}
                  />
                  {errors.strn && (
                    <p className="text-xs text-destructive">
                      {errors.strn.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Select
                    value={planType}
                    onValueChange={(v) => setValue("planType", v as PlanType)}
                  >
                    <SelectTrigger id="planType" label="Plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Account details */}
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Your account
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Input
                      id="adminFirstName"
                      label="First name"
                      {...register("adminFirstName")}
                    />
                    {errors.adminFirstName && (
                      <p className="text-xs text-destructive">
                        {errors.adminFirstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Input
                      id="adminLastName"
                      label="Last name"
                      {...register("adminLastName")}
                    />
                    {errors.adminLastName && (
                      <p className="text-xs text-destructive">
                        {errors.adminLastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Input
                    id="adminEmail"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    startIcon={<Mail />}
                    {...register("adminEmail")}
                  />
                  {errors.adminEmail && (
                    <p className="text-xs text-destructive">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <PasswordInput
                    id="adminPassword"
                    label="Password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    startIcon={<Lock />}
                    {...register("adminPassword")}
                  />
                  {errors.adminPassword && (
                    <p className="text-xs text-destructive">
                      {errors.adminPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Registering…
                    </>
                  ) : (
                    "Register company"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ZarnTaxSync · FBR Digital Invoicing
          </p>
        </div>
      </div>
    </div>
  );
}
