import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Boxes,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/common/DataTable";
import {
  useCreateProduct,
  useDeleteProduct,
  useImportProductsCsv,
  useProductsList,
  useUpdateProduct,
} from "@/hooks/useProducts";
import type { Product } from "@/api/products";

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
});

const ProductSchema = z.object({
  name: z.string().min(2, "Required"),
  defaultHsCode: z.string().min(4, "HS code is required"),
  defaultSaleType: z.string().min(1, "Sale type is required"),
  isActive: z.boolean().default(true),
});
type ProductValues = z.infer<typeof ProductSchema>;

export const Route = createFileRoute("/_auth/products")({
  validateSearch: SearchSchema,
  component: ProductsPage,
});

function ProductsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useProductsList({
    pageNumber: search.page,
    pageSize: 10,
  });
  const remove = useDeleteProduct();
  const importCsv = useImportProductsCsv();

  const onCsvPick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file");
      return;
    }
    importCsv.mutate(file);
  };

  const columns: ColumnDef<Product>[] = [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      header: "HS code",
      accessorKey: "defaultHsCode",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.defaultHsCode}</span>
      ),
    },
    { header: "Sale type", accessorKey: "defaultSaleType" },
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
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Boxes className="h-6 w-6 text-muted-foreground" />
            Products
          </h1>
          <p className="text-sm text-muted-foreground">
            Default HS code + sale type per product. Used to pre-fill invoice
            line items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => onCsvPick(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={importCsv.isPending}
          >
            {importCsv.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import CSV
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <FileSpreadsheet className="mr-2 inline h-3.5 w-3.5" />
        CSV columns: <code>name, defaultHsCode, defaultSaleType</code>. Import is
        all-or-nothing for valid rows; invalid rows are reported in the response.
      </div>

      <DataTable<Product, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) =>
          navigate({ to: "/products", search: { page } })
        }
        getRowId={(row) => row.id}
        emptyState="No products yet."
      />

      <ProductDialog
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
      />
      <ProductDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        mode="edit"
        product={editing}
      />

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>
              If invoices reference this product the backend will reject the
              delete; deactivate it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteId) return;
                await remove.mutateAsync(deleteId);
                setDeleteId(null);
              }}
              disabled={remove.isPending}
            >
              Delete product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductDialog({
  open,
  onClose,
  mode,
  product,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  product?: Product | null;
}) {
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<ProductValues>({
    resolver: zodResolver(ProductSchema),
    values:
      product && mode === "edit"
        ? {
            name: product.name,
            defaultHsCode: product.defaultHsCode,
            defaultSaleType: product.defaultSaleType,
            isActive: product.isActive,
          }
        : { name: "", defaultHsCode: "", defaultSaleType: "Local", isActive: true },
  });

  const isActive = watch("isActive");

  const onSubmit = handleSubmit(async (values) => {
    if (mode === "create") {
      await create.mutateAsync(values);
    } else if (product) {
      await update.mutateAsync(values);
    }
    reset();
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New product" : `Edit ${product?.name ?? "product"}`}
          </DialogTitle>
          <DialogDescription>
            Saved values pre-populate invoice item rows when this product is
            picked.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
            <Input id="name" label="Name" {...register("name")} />
            <Input id="defaultHsCode" label="Default HS code" placeholder="0000.00.00" {...register("defaultHsCode")} />
            <Input id="defaultSaleType" label="Default sale type" placeholder="Local" {...register("defaultSaleType")} />
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <Label htmlFor="isActive" className="text-sm">
              Active
            </Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {(create.isPending || update.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Create product" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
