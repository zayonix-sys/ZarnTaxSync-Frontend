import { format, parseISO } from "date-fns";

const PKR_FORMATTER = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatPKR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return PKR_FORMATTER.format(value);
}

/** NTN (7 digits) → "1234567"; CNIC (13) → "12345-1234567-1"; otherwise raw. */
export function formatNtnCnic(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }
  return digits;
}

export function formatDate(value: string | Date | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, pattern);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "dd MMM yyyy HH:mm");
}
