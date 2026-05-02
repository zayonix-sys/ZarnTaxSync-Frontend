import { api, getPaged } from "@/api/client";
import type {
  Environment,
  PaginationParams,
  PlanType,
  Tenant,
  TenantSetting,
  TokenStatus,
} from "@/api/types";

export interface CreateTenantRequest {
  name: string;
  subdomain: string;
  ntnCnic: string;
  planType: PlanType;
}

export interface UpdateTenantRequest {
  name: string;
  ntnCnic: string;
  planType: PlanType;
}

export async function listTenants(params: PaginationParams = {}) {
  return getPaged<Tenant>("/tenants", { params });
}

export async function getTenant(id: string): Promise<Tenant> {
  const res = await api.get<Tenant>(`/tenants/${id}`);
  return res.data;
}

export async function createTenant(body: CreateTenantRequest): Promise<Tenant> {
  const res = await api.post<Tenant>("/tenants", body);
  return res.data;
}

export async function updateTenant(
  id: string,
  body: UpdateTenantRequest,
): Promise<Tenant> {
  const res = await api.put<Tenant>(`/tenants/${id}`, body);
  return res.data;
}

export async function activateTenant(id: string): Promise<void> {
  await api.post<null>(`/tenants/${id}/activate`);
}

export async function deactivateTenant(id: string): Promise<void> {
  await api.post<null>(`/tenants/${id}/deactivate`);
}

export async function getTenantSettings(id: string): Promise<TenantSetting[]> {
  const res = await api.get<TenantSetting[]>(`/tenants/${id}/settings`);
  return res.data;
}

export async function upsertTenantSetting(
  id: string,
  body: TenantSetting,
): Promise<TenantSetting> {
  const res = await api.put<TenantSetting>(`/tenants/${id}/settings`, body);
  return res.data;
}

export interface FbrTokenRequest {
  token: string;
  /** ISO date string yyyy-MM-dd. */
  expiresAt: string;
}

export async function setSandboxToken(id: string, body: FbrTokenRequest): Promise<void> {
  await api.put<null>(`/tenants/${id}/token/sandbox`, body);
}

export async function setProductionToken(
  id: string,
  body: FbrTokenRequest,
): Promise<void> {
  await api.put<null>(`/tenants/${id}/token/production`, body);
}

export async function setEnvironment(id: string, environment: Environment): Promise<void> {
  await api.put<null>(`/tenants/${id}/environment`, { environment });
}

export async function getTokenStatus(id: string): Promise<TokenStatus> {
  const res = await api.get<TokenStatus>(`/tenants/${id}/token-status`);
  return res.data;
}
