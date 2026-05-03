import { api, getPaged } from "@/api/client";
import type { PaginationParams } from "@/api/types";

export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  userId: string | null;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: string | null;
  newValues: string | null;
  correlationId: string | null;
  ipAddress: string | null;
  additionalInfo: string | null;
  timestamp: string;
}

export interface AuditLogParams extends PaginationParams {
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listAuditLogs(params: AuditLogParams = {}) {
  return getPaged<AuditLogEntry>("/audit-logs", { params });
}

export async function listAuditLogsForEntity(
  entityType: string,
  entityId: string,
  params: PaginationParams = {},
) {
  return getPaged<AuditLogEntry>(
    `/audit-logs/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    { params },
  );
}
