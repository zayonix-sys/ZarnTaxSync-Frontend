import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  listAuditLogs,
  listAuditLogsForEntity,
  type AuditLogParams,
} from "@/api/auditLogs";
import type { PaginationParams } from "@/api/types";

export function useAuditLogs(params: AuditLogParams) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => listAuditLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useEntityAuditLogs(
  entityType: string | undefined,
  entityId: string | undefined,
  params: PaginationParams,
) {
  return useQuery({
    queryKey: ["audit-logs", "entity", entityType, entityId, params],
    queryFn: () => listAuditLogsForEntity(entityType!, entityId!, params),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
  });
}
