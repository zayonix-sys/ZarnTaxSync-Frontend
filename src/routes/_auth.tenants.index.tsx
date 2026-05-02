import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/common/DataTable";
import { useTenantsList } from "@/hooks/useTenants";
import type { Tenant } from "@/api/types";
import { formatDate } from "@/lib/format";

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
  search: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/tenants/")({
  validateSearch: SearchSchema,
  component: TenantsIndexPage,
});

function TenantsIndexPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const { data, isLoading } = useTenantsList({
    pageNumber: search.page,
    pageSize: 10,
    search: search.search,
  });

  const onSearchChange = (value: string) => {
    navigate({
      to: "/tenants",
      search: { page: 1, search: value || undefined },
      replace: true,
    });
  };

  const onPageChange = (page: number) => {
    navigate({
      to: "/tenants",
      search: { ...search, page },
    });
  };

  const columns: ColumnDef<Tenant>[] = [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            to="/tenants/$id"
            params={{ id: row.original.id }}
            className="font-medium text-foreground hover:text-primary"
          >
            {row.original.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {row.original.subdomain}.zarntaxsync.com
          </span>
        </div>
      ),
    },
    {
      header: "NTN / CNIC",
      accessorKey: "ntnCnic",
    },
    {
      header: "Plan",
      accessorKey: "planType",
      cell: ({ row }) => <Badge variant="outline">{row.original.planType}</Badge>,
    },
    {
      header: "Branches",
      accessorKey: "branchCount",
    },
    {
      header: "Users",
      accessorKey: "userCount",
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
      header: "Created",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            Tenants
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide tenant management. Only SuperAdmin can manage tenants.
          </p>
        </div>
        <Button asChild>
          <Link to="/tenants/new">
            <Plus className="h-4 w-4" />
            New tenant
          </Link>
        </Button>
      </div>

      <div className="flex max-w-sm items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or NTN/CNIC"
            defaultValue={search.search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable<Tenant, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={onPageChange}
        emptyState={
          <div className="space-y-2">
            <p>No tenants yet.</p>
            <Button asChild size="sm">
              <Link to="/tenants/new">Create the first tenant</Link>
            </Button>
          </div>
        }
        getRowId={(row) => row.id}
      />
    </div>
  );
}
