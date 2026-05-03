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

// ----------------------------- Phase 4 — Invoices ------------------------------

export type InvoiceStatus =
  | "Draft"
  | "Pending"
  | "Submitted"
  | "Failed"
  | "Cancelled";

/** Per API_ENDPOINTS.md v2.0 — PascalCase, no spaces. */
export type InvoiceType = "SaleInvoice" | "DebitNote";

export type Province =
  | "Punjab"
  | "Sindh"
  | "KPK"
  | "Balochistan"
  | "Islamabad"
  | "AJK"
  | "GilgitBaltistan";

export const PROVINCES: Province[] = [
  "Punjab",
  "Sindh",
  "KPK",
  "Balochistan",
  "Islamabad",
  "AJK",
  "GilgitBaltistan",
];

export interface InvoiceItem {
  id?: string;
  itemName: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  scenarioId?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  customerId: string;
  customerName: string;
  customerNtnCnic: string;
  customerAddress?: string;
  customerProvince?: Province;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  irn?: string | null;
  fbrSubmittedAt?: string | null;
  errorMessage?: string | null;
  scenarioId?: number;
  branchId?: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceRequest {
  invoiceType: InvoiceType;
  customerId: string;
  invoiceDate: string;
  dueDate?: string;
  scenarioId?: number;
  items: Array<Omit<InvoiceItem, "id" | "taxAmount" | "totalAmount">>;
}

export interface InvoiceListFilters extends PaginationParams {
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;
  fromDate?: string;
  toDate?: string;
}

export interface ExcelUploadResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; message: string }>;
}

// ---------------------------- Phase 4 — Dashboard ------------------------------

export interface DashboardKpis {
  totalSales: number;
  totalSalesDelta: number;
  taxCollected: number;
  taxCollectedDelta: number;
  pendingSyncCount: number;
  errorCount: number;
}

export interface SalesPoint {
  date: string;
  amount: number;
}

export interface SalesByTaxRate {
  rate: number;
  amount: number;
  share: number;
}

export interface SyncStatus {
  apiConnected: boolean;
  lastSyncAt: string | null;
  failedInvoices: number;
}

export interface ErrorLogEntry {
  id: string;
  occurredAt: string;
  invoiceNumber: string;
  message: string;
}

// ----------------------------- Phase 5 / 6 — Customers ----------------------

export interface Customer {
  id: string;
  name: string;
  ntnCnic: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: Province;
  isActive: boolean;
  invoiceCount: number;
  totalSpend: number;
  createdAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  ntnCnic: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: Province;
}

// ----------------------------- Phase 6 — Products / Items ---------------------

export interface Product {
  id: string;
  name: string;
  hsCode: string;
  unitPrice: number;
  defaultTaxRate: number;
  unitOfMeasure: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProductRequest {
  name: string;
  hsCode: string;
  unitPrice: number;
  defaultTaxRate: number;
  unitOfMeasure: string;
}

// ----------------------------- Phase 5 — Users / Branches / API Keys ----------

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: Role;
  branchId: string | null;
  branchName?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  branchId?: string | null;
  password: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  province?: Province;
  isActive: boolean;
  userCount: number;
  createdAt: string;
}

export interface CreateBranchRequest {
  name: string;
  code: string;
  address?: string;
  province?: Province;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  /** Only present immediately after creation; never retrievable later. */
  fullKey?: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  /** ISO date string. */
  expiresAt?: string;
}

// ----------------------------- Phase 5 — FBR Integration ----------------------

export interface IntegrationStatus {
  apiConnected: boolean;
  environment: Environment;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  daysRemaining: number;
  pendingQueueSize: number;
  failedQueueSize: number;
}

// ----------------------------- Phase 6 — Audit + Reports ----------------------

export type AuditAction =
  | "Create"
  | "Update"
  | "Delete"
  | "Login"
  | "Logout"
  | "SubmitInvoice"
  | "RetryInvoice"
  | "CertifyScenario";

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  userEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  ipAddress?: string;
}

export interface AuditLogFilters extends PaginationParams {
  action?: AuditAction;
  fromDate?: string;
  toDate?: string;
  userEmail?: string;
}

export interface ReportSummary {
  totalSales: number;
  totalTax: number;
  syncedToFbrPercent: number;
  totalInvoices: number;
  monthly: Array<{ month: string; sales: number; tax: number }>;
}

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
}
