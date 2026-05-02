import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTablePagination {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  pagination?: DataTablePagination;
  onPageChange?: (pageNumber: number) => void;
  onRowClick?: (row: TData) => void;
  emptyState?: React.ReactNode;
  /** Optional row key getter; defaults to row index. */
  getRowId?: (row: TData, index: number) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  onRowClick,
  emptyState,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    manualPagination: true,
  });

  const showFooter = !!pagination;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} style={{ width: h.getSize() }}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  {columns.map((_c, j) => (
                    <TableCell key={`sc-${i}-${j}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyState ?? "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showFooter && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {pagination!.totalCount > 0
              ? `Showing ${(pagination!.pageNumber - 1) * pagination!.pageSize + 1}\u2013${Math.min(
                  pagination!.pageNumber * pagination!.pageSize,
                  pagination!.totalCount,
                )} of ${pagination!.totalCount}`
              : "0 results"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination!.hasPreviousPage}
              onClick={() => onPageChange?.(pagination!.pageNumber - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-2">
              Page {pagination!.pageNumber} of {Math.max(pagination!.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination!.hasNextPage}
              onClick={() => onPageChange?.(pagination!.pageNumber + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
