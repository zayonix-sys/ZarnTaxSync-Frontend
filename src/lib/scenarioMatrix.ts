/**
 * FBR Digital Invoicing Scenario Matrix
 *
 * Maps a tenant's business activity + sector to the subset of the 28 PRAL
 * sandbox scenarios that apply to them. Source: FBR DI API V1.12 §10.
 *
 * NOTE: These mappings are best-effort placeholders based on the public FBR
 * documentation. Verify the exact mapping with FBR PRAL before treating any
 * tenant as "fully certified".
 *
 * Used by:
 *   - Phase 2: tenant Overview tab "applicable scenarios" preview
 *   - Phase 3: scenarios page filter (hides non-applicable rows)
 */

export type BusinessActivity =
  | "Manufacturer"
  | "Importer"
  | "Distributor"
  | "Wholesaler"
  | "Exporter"
  | "Retailer"
  | "ServiceProvider";

export type Sector =
  | "AllOtherSectors"
  | "Steel"
  | "FMCG"
  | "Textile"
  | "Telecom"
  | "Petroleum"
  | "Electricity"
  | "Gas"
  | "Services"
  | "AutoParts"
  | "Pharmaceuticals";

export const BUSINESS_ACTIVITY_OPTIONS: { value: BusinessActivity; label: string }[] = [
  { value: "Manufacturer", label: "Manufacturer" },
  { value: "Importer", label: "Importer" },
  { value: "Distributor", label: "Distributor" },
  { value: "Wholesaler", label: "Wholesaler" },
  { value: "Exporter", label: "Exporter" },
  { value: "Retailer", label: "Retailer" },
  { value: "ServiceProvider", label: "Service Provider" },
];

export const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: "AllOtherSectors", label: "All Other Sectors" },
  { value: "Steel", label: "Steel" },
  { value: "FMCG", label: "FMCG" },
  { value: "Textile", label: "Textile" },
  { value: "Telecom", label: "Telecom" },
  { value: "Petroleum", label: "Petroleum" },
  { value: "Electricity", label: "Electricity" },
  { value: "Gas", label: "Gas" },
  { value: "Services", label: "Services" },
  { value: "AutoParts", label: "Auto Parts" },
  { value: "Pharmaceuticals", label: "Pharmaceuticals" },
];

/** Manufacturer + AllOtherSectors → 11 scenarios (per spec). */
const MANUFACTURER_ALL_OTHER: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Retailer + AllOtherSectors → 16 scenarios (per spec). */
const RETAILER_ALL_OTHER: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

/** Default fallback if a precise mapping isn't known yet. */
const DEFAULT_FALLBACK: number[] = [1, 2, 3, 4, 5];

const MATRIX: Record<string, number[]> = {
  "Manufacturer:AllOtherSectors": MANUFACTURER_ALL_OTHER,
  "Manufacturer:Steel": [1, 2, 3, 4, 5, 17, 18],
  "Manufacturer:FMCG": [1, 2, 3, 4, 5, 6, 19],
  "Manufacturer:Textile": [1, 2, 3, 4, 5, 20],
  "Manufacturer:Pharmaceuticals": [1, 2, 3, 4, 5, 21],

  "Importer:AllOtherSectors": [1, 2, 3, 4, 5, 22],
  "Distributor:AllOtherSectors": [1, 2, 3, 4, 5, 6],
  "Wholesaler:AllOtherSectors": [1, 2, 3, 4, 5, 6, 7],
  "Exporter:AllOtherSectors": [1, 2, 3, 4, 5, 23],

  "Retailer:AllOtherSectors": RETAILER_ALL_OTHER,
  "Retailer:FMCG": [1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 19, 24],

  "ServiceProvider:AllOtherSectors": [1, 2, 3, 25, 26],
  "ServiceProvider:Telecom": [1, 2, 3, 25, 26, 27],
  "ServiceProvider:Services": [1, 2, 3, 25, 26, 28],
};

/**
 * Returns the applicable scenario numbers for the given activity + sector.
 * Returns `null` if either input is missing — caller should render a
 * "Set Business Activity on the Tenant Overview tab" empty state.
 */
export function getApplicableScenarios(
  activity: BusinessActivity | null | undefined,
  sector: Sector | null | undefined,
): number[] | null {
  if (!activity || !sector) return null;
  const key = `${activity}:${sector}`;
  return MATRIX[key] ?? DEFAULT_FALLBACK;
}
