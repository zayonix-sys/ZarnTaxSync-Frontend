import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  cancelInvoice,
  getInvoice,
  getSubmissionLogs,
  listInvoices,
  postInvoiceData,
  uploadInvoiceExcel,
  validateInvoiceData,
  type InvoiceListParams,
  type PostInvoiceRequest,
} from "@/api/invoices";

const INVOICES_KEY = "invoices";
const INVOICE_KEY = "invoice";
const SUBMISSION_LOGS_KEY = "invoice-submission-logs";

export function useInvoicesList(params: InvoiceListParams) {
  return useQuery({
    queryKey: [INVOICES_KEY, params],
    queryFn: () => listInvoices(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [INVOICE_KEY, id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });
}

export function useSubmissionLogs(id: string | undefined) {
  return useQuery({
    queryKey: [SUBMISSION_LOGS_KEY, id],
    queryFn: () => getSubmissionLogs(id!),
    enabled: !!id,
  });
}

export function useCancelInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cancelInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVOICES_KEY] });
      qc.invalidateQueries({ queryKey: [INVOICE_KEY, id] });
      toast.success("Invoice cancelled");
    },
  });
}

export function useValidateInvoice() {
  return useMutation({
    mutationFn: (body: PostInvoiceRequest) => validateInvoiceData(body),
  });
}

export function usePostInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: PostInvoiceRequest;
      idempotencyKey: string;
    }) => postInvoiceData(body, idempotencyKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}

export function useUploadInvoiceExcel() {
  return useMutation({
    mutationFn: ({ file, autoSubmit }: { file: File; autoSubmit: boolean }) =>
      uploadInvoiceExcel(file, autoSubmit),
  });
}
