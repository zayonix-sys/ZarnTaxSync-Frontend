import { api } from "@/api/client";
import type {
  PostInvoiceRequest,
  PostInvoiceResponse,
} from "@/api/invoices";

/**
 * POST /integration/invoices — entry point for ERP / POS systems pushing
 * invoices into ZarnTaxSync. Authenticated via X-Api-Key (machine-to-machine);
 * the optional X-External-Reference-Id acts as the caller's idempotency key.
 *
 * The web UI uses this only for the "Test push" tab on the Integration page —
 * normal user-driven invoice creation goes through `POST /di/postinvoicedata`.
 */
export async function pushIntegrationInvoice(
  body: PostInvoiceRequest,
  externalReferenceId?: string,
): Promise<PostInvoiceResponse> {
  const res = await api.post<PostInvoiceResponse>("/integration/invoices", body, {
    headers: externalReferenceId
      ? { "X-External-Reference-Id": externalReferenceId }
      : undefined,
  });
  return res.data;
}
