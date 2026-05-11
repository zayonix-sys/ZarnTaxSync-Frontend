import { api, getPaged } from "@/api/client";
import type { PaginationParams } from "@/api/types";

export interface Branch {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  address?: string;
  city: string;
  province: string;
  phone?: string;
  isActive: boolean;
  isHeadOffice: boolean;
  userCount: number;
  invoiceCount: number;
}

export interface CreateBranchRequest {
  code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  isHeadOffice: boolean;
}

export interface UpdateBranchRequest {
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
}

export async function listBranches(params: PaginationParams = {}) {
  return getPaged<Branch>("/branches", { params });
}

export async function getBranch(id: string): Promise<Branch> {
  const res = await api.get<Branch>(`/branches/${id}`);
  return res.data;
}

export async function createBranch(body: CreateBranchRequest): Promise<Branch> {
  const res = await api.post<Branch>("/branches", body);
  return res.data;
}

export async function updateBranch(
  id: string,
  body: UpdateBranchRequest,
): Promise<Branch> {
  const res = await api.put<Branch>(`/branches/${id}`, body);
  return res.data;
}

export async function activateBranch(id: string): Promise<void> {
  await api.post<null>(`/branches/${id}/activate`);
}

export async function deactivateBranch(id: string): Promise<void> {
  await api.post<null>(`/branches/${id}/deactivate`);
}
