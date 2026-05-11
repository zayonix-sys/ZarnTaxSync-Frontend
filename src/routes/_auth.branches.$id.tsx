import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Building, Loader2, MapPin, Power, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/common/DataTable";
import { RequireRole } from "@/components/common/RequireRole";
import {
  useBranch,
  useToggleBranchActive,
  useUpdateBranch,
} from "@/hooks/useBranches";
import { useUsersList } from "@/hooks/useUsers";
import { useProvinces, useCities } from "@/hooks/useReference";
import { ROLE_HIERARCHY } from "@/api/types";
import { useAuthStore } from "@/stores/auth";
import type { UserListItem } from "@/api/users";

const UpdateBranchSchema = z.object({
  name: z.string().min(2, "Required"),
  address: z.string().min(2, "Required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province is required"),
  phone: z.string().optional().default(""),
});
type UpdateBranchValues = z.infer<typeof UpdateBranchSchema>;

export const Route = createFileRoute("/_auth/branches/$id")({
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role;
    if (!role || ROLE_HIERARCHY[role] < ROLE_HIERARCHY.BranchManager) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: BranchDetailPage,
});

function BranchDetailPage() {
  const { id } = Route.useParams();
  const { data: branch, isLoading } = useBranch(id);
  const toggle = useToggleBranchActive(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="text-muted-foreground text-sm">Branch not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/branches">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {branch.name}
              </h1>
              {branch.isHeadOffice && (
                <Badge variant="info">Head Office</Badge>
              )}
              <Badge variant={branch.isActive ? "success" : "secondary"}>
                {branch.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Code: <span className="font-mono">{branch.code}</span>
              {branch.city && branch.province && (
                <>
                  {" · "}
                  <MapPin className="inline h-3 w-3" /> {branch.city},{" "}
                  {branch.province}
                </>
              )}
            </p>
          </div>
        </div>

        <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
          <Button
            variant="outline"
            size="sm"
            disabled={
              (branch.isHeadOffice && branch.isActive) || toggle.isPending
            }
            onClick={() => toggle.mutate({ activate: !branch.isActive })}
          >
            {toggle.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {branch.isActive ? "Deactivate" : "Activate"}
          </Button>
        </RequireRole>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">
            <Building className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <DetailsTab branch={branch} branchId={id} />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersTab branchId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailsTab({
  branch,
  branchId,
}: {
  branch: {
    code: string;
    name: string;
    address?: string;
    city: string;
    province: string;
    phone?: string;
    isHeadOffice: boolean;
  };
  branchId: string;
}) {
  const update = useUpdateBranch(branchId);
  const { data: provinces = [] } = useProvinces();
  const [selectedProvince, setSelectedProvince] = useState(
    branch.province ?? "",
  );
  const { data: cities = [] } = useCities(selectedProvince || null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateBranchValues>({
    resolver: zodResolver(UpdateBranchSchema),
    defaultValues: {
      name: branch.name,
      address: branch.address ?? "",
      city: branch.city,
      province: branch.province,
      phone: branch.phone ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await update.mutateAsync(values);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branch information</CardTitle>
          <CardDescription>
            Code and head-office status are read-only after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Input
              id="code"
              label="Code"
              value={branch.code}
              disabled
              className="font-mono"
            />
          </div>

          <div className="space-y-1">
            <Input id="name" label="Name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Input id="address" label="Address" {...register("address")} />
            {errors.address && (
              <p className="text-xs text-destructive">
                {errors.address.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Controller
                control={control}
                name="province"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setSelectedProvince(v);
                      setValue("city", "");
                    }}
                  >
                    <SelectTrigger id="province" label="Province">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => (
                        <SelectItem key={p.code} value={p.code}>
                          {p.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.province && (
                <p className="text-xs text-destructive">
                  {errors.province.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedProvince}
                  >
                    <SelectTrigger id="city" label="City">
                      <SelectValue
                        placeholder={
                          selectedProvince ? "Select city" : "Select province first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.city && (
                <p className="text-xs text-destructive">
                  {errors.city.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Input id="phone" label="Phone" {...register("phone")} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-2.5">
            <Label htmlFor="isHeadOffice" className="text-sm">
              Head office
            </Label>
            <Switch
              id="isHeadOffice"
              checked={branch.isHeadOffice}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
        <Button
          type="submit"
          disabled={isSubmitting || update.isPending || !isDirty}
        >
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </RequireRole>
    </form>
  );
}

function UsersTab({ branchId }: { branchId: string }) {
  const { data, isLoading } = useUsersList({
    branchId,
    pageNumber: 1,
    pageSize: 50,
  });

  const columns: ColumnDef<UserListItem>[] = [
    {
      header: "Name",
      accessorKey: "fullName",
      cell: ({ row }) => (
        <Link
          to="/users/$id"
          params={{ id: row.original.id }}
          className="font-medium hover:text-primary"
        >
          {row.original.fullName}
        </Link>
      ),
    },
    { header: "Email", accessorKey: "email" },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role}</Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
  ];

  return (
    <DataTable<UserListItem, unknown>
      columns={columns}
      data={data?.items ?? []}
      loading={isLoading}
      getRowId={(row) => row.id}
      emptyState="No users assigned to this branch."
    />
  );
}
