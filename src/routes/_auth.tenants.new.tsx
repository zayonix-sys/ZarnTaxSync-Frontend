import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnboardTenant } from "@/hooks/useTenants";
import type { PlanType } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

const NTN_OR_CNIC = /^\d{7}$|^\d{13}$/;

const TenantSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  subdomain: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only"),
  ntnCnic: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => NTN_OR_CNIC.test(v), "Must be a 7-digit NTN or 13-digit CNIC"),
  planType: z.enum(["Standard", "Professional", "Enterprise"]),
  adminFirstName: z.string().min(1, "Admin first name is required").max(100),
  adminLastName: z.string().min(1, "Admin last name is required").max(100),
  adminEmail: z.string().email("Enter a valid admin email"),
  adminPassword: z
    .string()
    .min(8, "Admin password must be at least 8 characters")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/\d/, "Must include a number")
    .regex(/[@$!%*?&\-_#^]/, "Must include a special character"),
});

type TenantFormValues = z.infer<typeof TenantSchema>;

export const Route = createFileRoute("/_auth/tenants/new")({
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role;
    if (role !== "SuperAdmin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: NewTenantPage,
});

function NewTenantPage() {
  const navigate = useNavigate();
  const mutation = useOnboardTenant();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(TenantSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      ntnCnic: "",
      planType: "Standard",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  const planType = watch("planType");

  const onSubmit = handleSubmit(async (values) => {
    const result = await mutation.mutateAsync(values);
    navigate({ to: "/tenants/$id", params: { id: result.tenantId } });
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/tenants">
            <ArrowLeft className="h-4 w-4" />
            Back to tenants
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New tenant</h1>
        <p className="text-sm text-muted-foreground">
          Create a tenant. You can upload FBR tokens and configure settings on the
          tenant detail page after creation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant details</CardTitle>
          <CardDescription>All fields are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" placeholder="Acme Pvt Ltd" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  placeholder="acme"
                  className="flex-1"
                  {...register("subdomain")}
                />
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  .zarntaxsync.com
                </span>
              </div>
              {errors.subdomain && (
                <p className="text-xs text-destructive">{errors.subdomain.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ntnCnic">NTN / CNIC</Label>
              <Input
                id="ntnCnic"
                inputMode="numeric"
                placeholder="7-digit NTN or 13-digit CNIC"
                {...register("ntnCnic")}
              />
              {errors.ntnCnic && (
                <p className="text-xs text-destructive">{errors.ntnCnic.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="planType">Plan</Label>
              <Select
                value={planType}
                onValueChange={(v) => setValue("planType", v as PlanType)}
              >
                <SelectTrigger id="planType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              {errors.planType && (
                <p className="text-xs text-destructive">{errors.planType.message}</p>
              )}
            </div>

            <div className="pt-2">
              <h2 className="text-sm font-medium">Initial Tenant Admin</h2>
              <p className="text-xs text-muted-foreground">
                This user is created automatically during onboarding.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">First name</Label>
                <Input id="adminFirstName" {...register("adminFirstName")} />
                {errors.adminFirstName && (
                  <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Last name</Label>
                <Input id="adminLastName" {...register("adminLastName")} />
                {errors.adminLastName && (
                  <p className="text-xs text-destructive">{errors.adminLastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email</Label>
              <Input id="adminEmail" type="email" {...register("adminEmail")} />
              {errors.adminEmail && (
                <p className="text-xs text-destructive">{errors.adminEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Temporary password</Label>
              <Input id="adminPassword" type="password" autoComplete="new-password" {...register("adminPassword")} />
              {errors.adminPassword && (
                <p className="text-xs text-destructive">{errors.adminPassword.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create tenant and admin"}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link to="/tenants">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
