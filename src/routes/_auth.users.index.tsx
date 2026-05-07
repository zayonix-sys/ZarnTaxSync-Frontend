import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Lock, Plus, Search, UserCog, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser, useUsersList } from "@/hooks/useUsers";
import { useBranchesList } from "@/hooks/useBranches";
import { RequireRole } from "@/components/common/RequireRole";
import { formatDate } from "@/lib/format";
import { formatRoleLabel } from "@/lib/roles";
import { ROLE_HIERARCHY } from "@/api/types";
import type { UserListItem } from "@/api/users";
import { normalizeError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
  search: z.string().optional().catch(undefined),
  branchId: z.string().optional().catch(undefined),
});

const NewUserSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
  branchId: z.string().min(1, "Branch is required"),
  role: z.enum(["TenantAdmin", "BranchManager", "Operator", "Viewer"]),
});

type NewUserValues = z.infer<typeof NewUserSchema>;

export const Route = createFileRoute("/_auth/users/")({
  validateSearch: SearchSchema,
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role;
    if (!role || ROLE_HIERARCHY[role] < ROLE_HIERARCHY.BranchManager) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useUsersList({
    pageNumber: search.page,
    pageSize: 10,
    search: search.search,
    branchId: search.branchId,
  });

  const { data: branches } = useBranchesList({ pageNumber: 1, pageSize: 100 });

  const setSearch = (next: Partial<typeof search>) => {
    navigate({
      to: "/users",
      search: { ...search, ...next, page: next.page ?? 1 },
      replace: true,
    });
  };

  const columns: ColumnDef<UserListItem>[] = [
    {
      header: "Name",
      accessorKey: "fullName",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            to="/users/$id"
            params={{ id: row.original.id }}
            className="font-medium text-foreground hover:text-primary"
          >
            {row.original.fullName}
          </Link>
          <span className="text-xs text-muted-foreground">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => <Badge variant="outline">{formatRoleLabel(row.original.role)}</Badge>,
    },
    {
      header: "Status",
      accessorKey: "isActive",
      cell: ({ row }) => {
        if (row.original.isLockedOut) {
          return (
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          );
        }
        return row.original.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        );
      },
    },
    {
      header: "Last login",
      accessorKey: "lastLoginAt",
      cell: ({ row }) =>
        row.original.lastLoginAt ? (
          <span className="text-muted-foreground">
            {formatDate(row.original.lastLoginAt)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="h-6 w-6 text-muted-foreground" />
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage who can sign in to your tenant.
          </p>
        </div>
        <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New user
          </Button>
        </RequireRole>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email"
            defaultValue={search.search ?? ""}
            onChange={(e) => setSearch({ search: e.target.value || undefined })}
            className="pl-9"
          />
        </div>
        <Select
          value={search.branchId ?? "all"}
          onValueChange={(v) =>
            setSearch({ branchId: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {(branches?.items ?? []).map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.code} — {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<UserListItem, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) =>
          navigate({ to: "/users", search: { ...search, page } })
        }
        getRowId={(row) => row.id}
        emptyState="No users yet."
      />

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        branches={(branches?.items ?? []).map((b) => ({
          id: b.id,
          label: `${b.code} — ${b.name}`,
        }))}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onClose,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  branches: Array<{ id: string; label: string }>;
}) {
  const create = useCreateUser();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewUserValues>({
    resolver: zodResolver(NewUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      branchId: "",
      role: "Operator",
    },
  });

  const role = watch("role");
  const branchId = watch("branchId");

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      reset();
      onClose();
    } catch (err) {
      const norm = normalizeError(err);
      // server-side validation errors surface inline if needed; toast for general
      if (!norm.errors.length) return;
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            They'll receive their credentials at the email you provide.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              <FieldError msg={errors.firstName?.message} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              <FieldError msg={errors.lastName?.message} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            <FieldError msg={errors.email?.message} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Initial password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              {...register("password")}
            />
            <FieldError msg={errors.password?.message} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Branch</Label>
              <Select
                value={branchId}
                onValueChange={(v) => setValue("branchId", v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.branchId?.message} />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setValue("role", v as NewUserValues["role"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TenantAdmin">Tenant Admin</SelectItem>
                  <SelectItem value="BranchManager">Branch Manager</SelectItem>
                  <SelectItem value="Operator">Operator</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || create.isPending}>
              <UserCog className="h-4 w-4" />
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}
