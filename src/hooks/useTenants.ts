import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  activateTenant,
  createTenant,
  deactivateTenant,
  getTenant,
  getTenantSettings,
  getTokenStatus,
  listTenants,
  setEnvironment,
  setProductionToken,
  setSandboxToken,
  updateTenant,
  upsertTenantSetting,
  type CreateTenantRequest,
  type FbrTokenRequest,
  type UpdateTenantRequest,
} from "@/api/tenants";
import type { Environment, PaginationParams, TenantSetting } from "@/api/types";

const TENANTS_KEY = "tenants";
const TOKEN_STATUS_KEY = "token-status";
const TENANT_SETTINGS_KEY = "tenant-settings";

export function useTenantsList(params: PaginationParams) {
  return useQuery({
    queryKey: [TENANTS_KEY, params],
    queryFn: () => listTenants(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: [TENANTS_KEY, id],
    queryFn: () => getTenant(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTenantRequest) => createTenant(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TENANTS_KEY] });
      toast.success("Tenant created");
    },
  });
}

export function useUpdateTenant(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTenantRequest) => updateTenant(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TENANTS_KEY] });
      toast.success("Tenant updated");
    },
  });
}

export function useToggleTenantActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activate }: { activate: boolean }) =>
      activate ? activateTenant(id) : deactivateTenant(id),
    onSuccess: (_data, { activate }) => {
      qc.invalidateQueries({ queryKey: [TENANTS_KEY] });
      toast.success(activate ? "Tenant activated" : "Tenant deactivated");
    },
  });
}

export function useTenantSettings(id: string | undefined) {
  return useQuery({
    queryKey: [TENANT_SETTINGS_KEY, id],
    queryFn: () => getTenantSettings(id!),
    enabled: !!id,
  });
}

export function useUpsertTenantSetting(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantSetting) => upsertTenantSetting(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TENANT_SETTINGS_KEY, id] });
      toast.success("Setting saved");
    },
  });
}

export function useTokenStatus(id: string | undefined) {
  return useQuery({
    queryKey: [TOKEN_STATUS_KEY, id],
    queryFn: () => getTokenStatus(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useSetSandboxToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FbrTokenRequest) => setSandboxToken(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TOKEN_STATUS_KEY, id] });
      toast.success("Sandbox token saved");
    },
  });
}

export function useSetProductionToken(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FbrTokenRequest) => setProductionToken(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TOKEN_STATUS_KEY, id] });
      toast.success("Production token saved");
    },
  });
}

export function useSetEnvironment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (env: Environment) => setEnvironment(id, env),
    onSuccess: (_data, env) => {
      qc.invalidateQueries({ queryKey: [TOKEN_STATUS_KEY, id] });
      qc.invalidateQueries({ queryKey: [TENANTS_KEY, id] });
      toast.success(`Environment switched to ${env}`);
    },
  });
}
