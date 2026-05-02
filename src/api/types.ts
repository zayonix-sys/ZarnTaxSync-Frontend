/**
 * Shared DTO types — mirrors the .NET ApiResponse<T> envelope.
 * Note: backend uses `pageNumber` (not `page`) — see API_ENDPOINTS.md §D4.
 */

export interface PaginationMeta {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  pagination?: PaginationMeta;
}

export interface PagedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export type Role =
  | "SuperAdmin"
  | "TenantAdmin"
  | "BranchManager"
  | "Operator"
  | "Viewer";

export const ROLE_HIERARCHY: Record<Role, number> = {
  Viewer: 1,
  Operator: 2,
  BranchManager: 3,
  TenantAdmin: 4,
  SuperAdmin: 5,
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
  tenantId: string | null;
  branchId: string | null;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiry: string;
  user: User;
}

export interface NormalizedError {
  status: number;
  message: string;
  /** Field-level errors in `Field: message` format from FluentValidation. */
  errors: string[];
  correlationId?: string;
  isNetworkError?: boolean;
}

export type Environment = "Sandbox" | "Production";
export type PlanType = "Standard" | "Professional" | "Enterprise";

/** Tenant DTO (Phase 2). businessActivity / sector are stand-ins until backend N4 ships. */
export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  ntnCnic: string;
  planType: PlanType;
  isActive: boolean;
  branchCount: number;
  userCount: number;
  createdAt: string;
}

export interface TokenStatus {
  environment: Environment;
  expiresAt: string;
  daysRemaining: number;
}

export interface TenantSetting {
  key: string;
  value: string;
  description?: string;
  isEncrypted: boolean;
}

export type ScenarioStatus = "Pending" | "Passed" | "Failed";

export interface Scenario {
  scenarioNumber: number;
  scenarioName: string;
  status: ScenarioStatus;
  fbrResponse?: string;
  runAt: string | null;
  certifiedAt: string | null;
}

export interface ScenarioSummary {
  total: number;
  pending: number;
  passed: number;
  failed: number;
  progressPercent: number;
}

export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
}
