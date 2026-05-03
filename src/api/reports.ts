import { api, getPaged } from "@/api/client";
import type { PaginationParams, TokenStatus } from "@/api/types";
import type { InvoiceListItem } from "@/api/invoices";

/** GET /reports/dashboard — KPIs + last 7 days trend. */
export interface DashboardSnapshot {
  submittedToday: number;
  failedToday: number;
  pendingToday: number;
  deferredToday: number;
  last7Days: Array<{
    date: string;
    submitted: number;
    failed: number;
    pending: number;
    deferred: number;
  }>;
}

export interface ComplianceReport {
  isRule150QCompliant: boolean;
  isSroRiskDetected: boolean;
  penaltyRiskEstimate: number;
}

export async function getDashboard(): Promise<DashboardSnapshot> {
  const res = await api.get<DashboardSnapshot>("/reports/dashboard");
  return res.data;
}

export async function getComplianceReport(annualTurnover: number): Promise<ComplianceReport> {
  const res = await api.get<ComplianceReport>("/reports/compliance", {
    params: { annualTurnover },
  });
  return res.data;
}

export async function getFailedInvoices(params: PaginationParams = {}) {
  return getPaged<InvoiceListItem>("/reports/failed-invoices", { params });
}

/** Tenant-scope token status used for the persistent sandbox banner. */
export async function getReportsTokenStatus(): Promise<TokenStatus> {
  const res = await api.get<TokenStatus>("/reports/token-status");
  return res.data;
}
