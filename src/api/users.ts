import { api, getPaged } from "@/api/client";
import type { PaginationParams, Role } from "@/api/types";

export interface UserListItem {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  isLockedOut: boolean;
  lockoutEnd: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserDetail extends UserListItem {
  firstName: string;
  lastName: string;
}

export interface ListUsersParams extends PaginationParams {
  branchId?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  branchId: string;
  role: Role;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  branchId: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  status: "Active" | "Expired" | "Revoked";
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface CreateApiKeyRequest {
  name: string;
  /** yyyy-MM-dd or empty for never. */
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  rawKey: string;
  keyPrefix: string;
  name: string;
  expiresAt: string | null;
}

export async function listUsers(params: ListUsersParams = {}) {
  return getPaged<UserListItem>("/users", { params });
}

export async function getUser(id: string): Promise<UserDetail> {
  const res = await api.get<UserDetail>(`/users/${id}`);
  return res.data;
}

export async function createUser(body: CreateUserRequest): Promise<UserDetail> {
  const res = await api.post<UserDetail>("/users", body);
  return res.data;
}

export async function updateUser(id: string, body: UpdateUserRequest): Promise<UserDetail> {
  const res = await api.put<UserDetail>(`/users/${id}`, body);
  return res.data;
}

export async function changeUserRole(id: string, newRole: Role): Promise<void> {
  await api.post<null>(`/users/${id}/change-role`, { newRole });
}

export async function activateUser(id: string): Promise<void> {
  await api.post<null>(`/users/${id}/activate`);
}

export async function deactivateUser(id: string): Promise<void> {
  await api.post<null>(`/users/${id}/deactivate`);
}

export async function unlockUser(id: string): Promise<void> {
  await api.post<null>(`/users/${id}/unlock`);
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const res = await api.get<ApiKey[]>(`/users/${userId}/api-keys`);
  return res.data;
}

export async function createApiKey(
  userId: string,
  body: CreateApiKeyRequest,
): Promise<CreateApiKeyResponse> {
  const res = await api.post<CreateApiKeyResponse>(`/users/${userId}/api-keys`, body);
  return res.data;
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  await api.post<null>(`/users/${userId}/api-keys/${keyId}/revoke`);
}
