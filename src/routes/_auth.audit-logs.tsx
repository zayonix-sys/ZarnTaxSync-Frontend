import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, ScrollText, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/DataTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { parseISO, format } from "date-fns";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { formatDateTime } from "@/lib/format";
import type { AuditLogEntry } from "@/api/auditLogs";

const ENTITY_TYPES = [
  "Invoice",
  "Tenant",
  "User",
  "Branch",
  "Product",
  "ApiKey",
  "Setting",
] as const;

const SearchSchema = z.object({
  page: z.number().int().positive().catch(1),
  entityType: z.enum(ENTITY_TYPES).optional().catch(undefined),
  entityId: z.string().optional().catch(undefined),
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/audit-logs")({
  validateSearch: SearchSchema,
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useAuditLogs({
    pageNumber: search.page,
    pageSize: 10,
    entityType: search.entityType,
    entityId: search.entityId,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  });

  const setSearch = (next: Partial<typeof search>) => {
    navigate({
      to: "/audit-logs",
      search: { ...search, ...next, page: next.page ?? 1 },
      replace: true,
    });
  };

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      header: "When",
      accessorKey: "timestamp",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.timestamp)}
        </span>
      ),
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
    },
    {
      header: "Entity",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.entityName}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.entityId}
          </span>
        </div>
      ),
    },
    {
      header: "User",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.userId ?? "—"}
        </span>
      ),
    },
    {
      header: "IP",
      accessorKey: "ipAddress",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.ipAddress ?? "—"}
        </span>
      ),
    },
    {
      header: () => <span className="sr-only">Diff</span>,
      id: "diff",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            setOpenId(openId === row.original.id ? null : row.original.id)
          }
        >
          {openId === row.original.id ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Diff
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ScrollText className="h-6 w-6 text-muted-foreground" />
          Audit logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Every state change is recorded with old / new values.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Select
          value={search.entityType ?? "all"}
          onValueChange={(v) =>
            setSearch({
              entityType: v === "all" ? undefined : (v as (typeof ENTITY_TYPES)[number]),
            })
          }
        >
          <SelectTrigger label="Entity type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          label="Entity ID"
          defaultValue={search.entityId ?? ""}
          onChange={(e) => setSearch({ entityId: e.target.value || undefined })}
          startIcon={<Search />}
        />
        <DatePicker
          label="From date"
          date={search.dateFrom ? parseISO(search.dateFrom) : undefined}
          onChange={(d) => setSearch({ dateFrom: d ? format(d, "yyyy-MM-dd") : undefined })}
        />
        <DatePicker
          label="To date"
          date={search.dateTo ? parseISO(search.dateTo) : undefined}
          onChange={(d) => setSearch({ dateTo: d ? format(d, "yyyy-MM-dd") : undefined })}
        />
      </div>

      <DataTable<AuditLogEntry, unknown>
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={(page) =>
          navigate({ to: "/audit-logs", search: { ...search, page } })
        }
        getRowId={(row) => row.id}
        emptyState="No audit entries match these filters."
      />

      {openId && data?.items && (
        <DiffPanel
          entry={data.items.find((e) => e.id === openId)!}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function DiffPanel({
  entry,
  onClose,
}: {
  entry: AuditLogEntry;
  onClose: () => void;
}) {
  const oldFormatted = prettyJson(entry.oldValues);
  const newFormatted = prettyJson(entry.newValues);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-medium">{entry.action} on {entry.entityName}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {entry.entityId}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Pane title="Before" content={oldFormatted} tone="muted" />
        <Pane title="After" content={newFormatted} tone="primary" />
      </div>
    </div>
  );
}

function Pane({
  title,
  content,
  tone,
}: {
  title: string;
  content: string;
  tone: "muted" | "primary";
}) {
  return (
    <div>
      <div
        className={
          "mb-1 text-xs font-medium " +
          (tone === "primary" ? "text-primary" : "text-muted-foreground")
        }
      >
        {title}
      </div>
      <pre className="max-h-96 overflow-auto rounded-md border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed">
        {content || "—"}
      </pre>
    </div>
  );
}

function prettyJson(raw: string | null): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
