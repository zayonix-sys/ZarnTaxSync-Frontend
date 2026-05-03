import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceStatusBadge } from "@/components/invoice/InvoiceStatusBadge";
import { useInvoicesList } from "@/hooks/useInvoices";
import {
  getInvoiceByIrn,
  type InvoiceListItem,
  type InvoiceStatus,
  type InvoiceTypeValue,
} from "@/api/invoices";
import { formatDate, formatPKR } from "@/lib/format";
import { normalizeError } from "@/api/client";

const STATUS_VALUES = [
  "Draft",
  "Pending",
  "Submitted",
  "Failed",
  "Cancelled",
] as const;
const TYPE_VALUES = ["SaleInvoice", "DebitNote"] as const;

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
  search: z.string().optional().catch(undefined),
  status: z.enum(STATUS_VALUES).optional().catch(undefined),
  invoiceType: z.enum(TYPE_VALUES).optional().catch(undefined),
  fromDate: z.string().optional().catch(undefined),
  toDate: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/invoices/")({
  validateSearch: SearchSchema,
  component: InvoicesPage,
});

function InvoicesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [irnQuery, setIrnQuery] = useState("");
  const [irnLoading, setIrnLoading] = useState(false);

  const { data, isLoading } = useInvoicesList({
    pageNumber: search.page,
    pageSize: 10,
    search: search.search,
    status: search.status,
    invoiceType: search.invoiceType,
    fromDate: search.fromDate,
    toDate: search.toDate,
  });

  const setSearch = (next: Partial<typeof search>) => {
    navigate({ to: "/invoices", search: { ...search, ...next, page: 1 }, replace: true });
  };

  const onIrnLookup = async () => {
    const value = irnQuery.trim();
    if (!value) return;
    setIrnLoading(true);
    try {
      const inv = await getInvoiceByIrn(value);
      navigate({ to: "/invoices/$id", params: { id: inv.id } });
    } catch (err) {
      const norm = normalizeError(err);
      toast.error(norm.message || "IRN not found");
    } finally {
      setIrnLoading(false);
    }
  };

  const columns: ColumnDef<InvoiceListItem>[] = [
    {
      header: "IRN / Invoice #",
      accessorKey: "fbrInvoiceNumber",
      cell: ({ row }) => (
        <Link
          to="/invoices/$id"
          params={{ id: row.original.id }}
          className="font-mono text-xs text-foreground hover:text-primary"
        >
          {row.original.fbrInvoiceNumber ?? `INV-${row.original.id.slice(0, 6)}`}
        </Link>
      ),
    },
    {
      header: "Type",
      accessorKey: "invoiceType",
      cell: ({ row }) =>
        row.original.invoiceType === "DebitNote" ? "Debit Note" : "Sale Invoice",
    },
    {
      header: "Date",
      accessorKey: "invoiceDate",
      cell: ({ row }) => formatDate(row.original.invoiceDate),
    },
    {
      header: "Buyer",
      accessorKey: "buyerBusinessName",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.buyerBusinessName}</span>
          <span className="text-xs text-muted-foreground">
            from {row.original.sellerBusinessName}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
    },
    {
      header: () => <div className="text-right">Total tax</div>,
      accessorKey: "totalSalesTax",
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatPKR(row.original.totalSalesTax)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileText className="h-6 w-6 text-muted-foreground" />
            Invoices
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit, track, and manage your FBR invoices.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/invoices/upload">
              <Upload className="h-4 w-4" />
              Upload Excel
            </Link>
          </Button>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search buyer, seller or FBR #"
            defaultValue={search.search ?? ""}
            onChange={(e) => setSearch({ search: e.target.value || undefined })}
            className="pl-9"
          />
        </div>
        <Select
          value={search.status ?? "all"}
          onValueChange={(v) =>
            setSearch({ status: v === "all" ? undefined : (v as InvoiceStatus) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={search.invoiceType ?? "all"}
          onValueChange={(v) =>
            setSearch({
              invoiceType: v === "all" ? undefined : (v as InvoiceTypeValue),
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="SaleInvoice">Sale Invoice</SelectItem>
            <SelectItem value="DebitNote">Debit Note</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={search.fromDate ?? ""}
          onChange={(e) => setSearch({ fromDate: e.target.value || undefined })}
          aria-label="From date"
        />
        <Input
          type="date"
          value={search.toDate ?? ""}
          onChange={(e) => setSearch({ toDate: e.target.value || undefined })}
          aria-label="To date"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Look up by IRN:</span>
        <Input
          placeholder="FBR Invoice Reference Number"
          value={irnQuery}
          onChange={(e) => setIrnQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onIrnLookup()}
          className="h-8 max-w-xs"
        />
        <Button size="sm" variant="outline" onClick={onIrnLookup} disabled={irnLoading}>
          {irnLoading ? "Looking up…" : "Look up"}
        </Button>
      </div>

      <DataTable<InvoiceListItem, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) =>
          navigate({ to: "/invoices", search: { ...search, page } })
        }
        emptyState={
          <div className="space-y-2">
            <p>No invoices match these filters.</p>
            <Button asChild size="sm">
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" />
                Create the first invoice
              </Link>
            </Button>
          </div>
        }
        getRowId={(row) => row.id}
      />
    </div>
  );
}
