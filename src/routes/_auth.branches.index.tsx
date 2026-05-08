import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building,
  Loader2,
  Plus,
  Power,
  Search,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/common/DataTable";
import { RequireRole } from "@/components/common/RequireRole";
import {
  useBranchesList,
  useCreateBranch,
  useToggleBranchActive,
  useUpdateBranch,
} from "@/hooks/useBranches";
import type { Branch } from "@/api/branches";
import { ROLE_HIERARCHY } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
  search: z.string().optional().catch(undefined),
});

const BranchFormSchema = z.object({
  code: z.string().min(2, "Required"),
  name: z.string().min(2, "Required"),
  address: z.string().min(2, "Required"),
  city: z.string().min(2, "Required"),
  province: z.string().min(2, "Required"),
  phone: z.string().optional().default(""),
  isHeadOffice: z.boolean().default(false),
});
type BranchFormValues = z.infer<typeof BranchFormSchema>;

export const Route = createFileRoute("/_auth/branches/")({
  validateSearch: SearchSchema,
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role;
    if (!role || ROLE_HIERARCHY[role] < ROLE_HIERARCHY.BranchManager) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: BranchesPage,
});

function BranchesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useBranchesList({
    pageNumber: search.page,
    pageSize: 10,
    search: search.search,
  });

  const setSearch = (next: Partial<typeof search>) => {
    navigate({
      to: "/branches",
      search: { ...search, ...next, page: next.page ?? 1 },
      replace: true,
    });
  };

  const columns: ColumnDef<Branch>[] = [
    {
      header: "Code",
      accessorKey: "code",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{row.original.code}</span>
          {row.original.isHeadOffice && (
            <Badge variant="info" className="gap-1">
              <Star className="h-3 w-3" />
              HQ
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setEditing(row.original)}
          className="text-left font-medium hover:text-primary"
        >
          {row.original.name}
        </button>
      ),
    },
    { header: "City", accessorKey: "city" },
    { header: "Province", accessorKey: "province" },
    {
      header: "Users",
      accessorKey: "userCount",
    },
    {
      header: "Invoices",
      accessorKey: "invoiceCount",
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
    {
      header: () => <span className="sr-only">Actions</span>,
      id: "actions",
      cell: ({ row }) => <BranchActiveToggle branch={row.original} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building className="h-6 w-6 text-muted-foreground" />
            Branches
          </h1>
          <p className="text-sm text-muted-foreground">
            Tenant offices and warehouses. The head office is auto-flagged.
          </p>
        </div>
        <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New branch
          </Button>
        </RequireRole>
      </div>

      <Input
        label="Search name or code"
        defaultValue={search.search ?? ""}
        onChange={(e) => setSearch({ search: e.target.value || undefined })}
        startIcon={<Search />}
        className="max-w-sm"
      />

      <DataTable<Branch, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) =>
          navigate({ to: "/branches", search: { ...search, page } })
        }
        getRowId={(row) => row.id}
        emptyState="No branches yet."
      />

      <BranchSheet
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
      />
      <BranchSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        mode="edit"
        branch={editing}
      />
    </div>
  );
}

function BranchActiveToggle({ branch }: { branch: Branch }) {
  const toggle = useToggleBranchActive(branch.id);
  const disabled = branch.isHeadOffice && branch.isActive;

  const button = (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || toggle.isPending}
      onClick={() => toggle.mutate({ activate: !branch.isActive })}
    >
      {toggle.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Power className="h-3.5 w-3.5" />
      )}
      {branch.isActive ? "Deactivate" : "Activate"}
    </Button>
  );

  if (!disabled) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>Head office branch cannot be deactivated.</TooltipContent>
    </Tooltip>
  );
}

function BranchSheet({
  open,
  onClose,
  mode,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  branch?: Branch | null;
}) {
  const create = useCreateBranch();
  const update = useUpdateBranch(branch?.id ?? "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: {
      code: branch?.code ?? "",
      name: branch?.name ?? "",
      address: "",
      city: branch?.city ?? "",
      province: branch?.province ?? "",
      phone: "",
      isHeadOffice: branch?.isHeadOffice ?? false,
    },
    values:
      branch && mode === "edit"
        ? {
            code: branch.code,
            name: branch.name,
            address: "",
            city: branch.city,
            province: branch.province,
            phone: "",
            isHeadOffice: branch.isHeadOffice,
          }
        : undefined,
  });

  const isHeadOffice = watch("isHeadOffice");

  const onSubmit = handleSubmit(async (values) => {
    if (mode === "create") {
      await create.mutateAsync(values);
    } else if (branch) {
      await update.mutateAsync({
        name: values.name,
        address: values.address,
        city: values.city,
        province: values.province,
        phone: values.phone,
      });
    }
    reset();
    onClose();
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {mode === "create" ? "New branch" : `Edit ${branch?.name ?? "branch"}`}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Code is the short identifier used on invoices."
              : "Code and head-office status cannot be changed once created."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <Input
              id="code"
              label="Code"
              placeholder="e.g. KHI-01"
              {...register("code")}
              disabled={mode === "edit"}
            />
            <Input id="name" label="Name" {...register("name")} />
            <Input id="address" label="Address" {...register("address")} />
          <div className="grid grid-cols-2 gap-3">
                <Input id="city" label="City" {...register("city")} />
                <Input id="province" label="Province" {...register("province")} />
          </div>
            <Input id="phone" label="Phone" {...register("phone")} />
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <Label htmlFor="isHeadOffice" className="text-sm">
              Head office
            </Label>
            <Switch
              id="isHeadOffice"
              checked={isHeadOffice}
              onCheckedChange={(v) => setValue("isHeadOffice", v)}
              disabled={mode === "edit"}
            />
          </div>
          <SheetFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {(create.isPending || update.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Create branch" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
