import { api, getPaged } from "@/api/client";
import type { PaginationParams } from "@/api/types";

/**
 * Invoice DTOs — see Documents/API_ENDPOINTS.md §5 (Invoices, /api/v1/di).
 *
 * Critical type fixes per the canonical API doc (v2.0):
 * - `invoiceType`: PascalCase enum string ("SaleInvoice" | "DebitNote") — not display labels.
 * - `scenarioId`: integer (1..28).
 * - `rate`: number (e.g. 18). Display as "18%" only.
 * - `pageNumber`: not `page`.
 */

export type InvoiceTypeValue = "SaleInvoice" | "DebitNote";

export type InvoiceStatus =
  | "Draft"
  | "Pending"
  | "Submitted"
  | "Failed"
  | "Cancelled";

export type RegistrationType = "Registered" | "Unregistered";

export interface InvoiceListItem {
  id: string;
  fbrInvoiceNumber: string | null;
  invoiceType: InvoiceTypeValue;
  invoiceDate: string;
  sellerNtnCnic: string;
  sellerBusinessName: string;
  buyerBusinessName: string;
  status: InvoiceStatus;
  itemCount: number;
  totalSalesExcludingSt: number;
  totalSalesTax: number;
  createdAt: string;
  submittedAt: string | null;
}

export interface InvoiceItem {
  itemSequence: number;
  hsCode: string;
  productDescription: string;
  rate: number;
  uoM: string;
  quantity: number;
  totalValues: number;
  valueSalesExcludingSt: number;
  fixedNotifiedValueOrRetailPrice: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax: number;
  furtherTax: number;
  sroScheduleNo?: string;
  fedPayable: number;
  discount: number;
  saleType: string;
  sroItemSerialNo?: string;
  /** Per-item FBR rejection (populated after submit). */
  fbrItemErrorCode?: string;
  fbrItemError?: string;
}

export interface Invoice {
  id: string;
  fbrInvoiceNumber: string | null;
  invoiceType: InvoiceTypeValue;
  invoiceDate: string;
  sellerNtnCnic: string;
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
  buyerNtnCnic?: string;
  buyerBusinessName: string;
  buyerProvince: string;
  buyerAddress: string;
  buyerRegistrationType: RegistrationType;
  invoiceRefNo?: string;
  scenarioId?: number;
  saleType: string;
  totalQuantity: number;
  totalSalesTax: number;
  totalBillAmount: number;
  status: InvoiceStatus;
  fbrStatusCode?: string;
  fbrStatusMessage?: string;
  submittedAt?: string;
  createdAt: string;
  items: InvoiceItem[];
  /** Debit Note only — backend gap B2 placeholder fields. */
  debitNoteReason?: string;
  debitNoteReasonRemarks?: string;
}

export interface InvoiceListParams extends PaginationParams {
  status?: InvoiceStatus;
  invoiceType?: InvoiceTypeValue;
  fromDate?: string;
  toDate?: string;
}

export interface PostInvoiceItemRequest {
  itemSequence: number;
  hsCode: string;
  productDescription: string;
  rate: number;
  uoM: string;
  quantity: number;
  totalValues: number;
  valueSalesExcludingSt: number;
  fixedNotifiedValueOrRetailPrice: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax: number;
  furtherTax: number;
  sroScheduleNo?: string;
  fedPayable: number;
  discount: number;
  saleType: string;
  sroItemSerialNo?: string;
}

export interface PostInvoiceRequest {
  invoiceType: InvoiceTypeValue;
  invoiceDate: string;
  sellerNtnCnic: string;
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
  buyerNtnCnic?: string;
  buyerBusinessName: string;
  buyerProvince: string;
  buyerAddress: string;
  buyerRegistrationType: RegistrationType;
  invoiceRefNo?: string;
  scenarioId?: number;
  saleType: string;
  totalQuantity: number;
  totalSalesTax: number;
  totalBillAmount: number;
  items: PostInvoiceItemRequest[];
  /** Backend gap B2 — frontend sends today; backend will accept once shipped. */
  debitNoteReason?: string;
  debitNoteReasonRemarks?: string;
}

export interface ItemSubmissionStatus {
  itemSequence: number;
  fbrItemInvoiceNo?: string;
  statusCode: string;
  errorCode?: string;
  error?: string;
}

export interface PostInvoiceResponse {
  localInvoiceId: string;
  fbrInvoiceNumber: string | null;
  status: InvoiceStatus;
  fbrStatusCode?: string;
  fbrStatusMessage?: string;
  submittedAt?: string;
  itemStatuses: ItemSubmissionStatus[];
}

export interface ValidateInvoiceResponse {
  isValid: boolean;
  statusCode?: string;
  status?: string;
  errorCode?: string;
  error?: string;
  itemStatuses: Pick<ItemSubmissionStatus, "itemSequence" | "statusCode" | "errorCode" | "error">[];
}

export interface SubmissionLog {
  id: string;
  invoiceId: string;
  attemptNumber: number;
  requestPayloadJson: string;
  responsePayloadJson: string;
  httpStatusCode: number;
  fbrErrorCode?: string;
  fbrErrorMessage?: string;
  attemptedAt: string;
}

export interface ExcelUploadResponse {
  jobId: string;
  status: string;
  totalRows: number;
  message?: string;
}

export async function listInvoices(params: InvoiceListParams = {}) {
  return getPaged<InvoiceListItem>("/di", { params });
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await api.get<Invoice>(`/di/${id}`);
  return res.data;
}

export async function getInvoiceByIrn(irn: string): Promise<Invoice> {
  const res = await api.get<Invoice>(`/di/by-irn/${encodeURIComponent(irn)}`);
  return res.data;
}

export async function getSubmissionLogs(id: string): Promise<SubmissionLog[]> {
  const res = await api.get<SubmissionLog[]>(`/di/${id}/submission-logs`);
  return res.data;
}

/**
 * Fetches the FBR-compliant invoice PDF as a Blob via Bearer-authed request.
 * Per API_ENDPOINTS.md §5 — do NOT use window.open(); must include auth header.
 */
export async function downloadInvoicePdf(id: string): Promise<void> {
  const res = await api.get(`/di/${id}/pdf`, { responseType: "blob" });
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function cancelInvoice(id: string): Promise<void> {
  await api.post<null>(`/di/${id}/cancel`);
}

export async function validateInvoiceData(
  body: PostInvoiceRequest,
): Promise<ValidateInvoiceResponse> {
  const res = await api.post<ValidateInvoiceResponse>("/di/validateinvoicedata", body);
  return res.data;
}

export async function postInvoiceData(
  body: PostInvoiceRequest,
  idempotencyKey: string,
): Promise<PostInvoiceResponse> {
  const res = await api.post<PostInvoiceResponse>("/di/postinvoicedata", body, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return res.data;
}

export async function uploadInvoiceExcel(
  file: File,
  autoSubmit: boolean,
): Promise<ExcelUploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("autoSubmit", String(autoSubmit));
  const res = await api.post<ExcelUploadResponse>("/di/upload-excel", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
