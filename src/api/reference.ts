import { api } from "@/api/client";

/** Reference / lookup data — see Documents/API_ENDPOINTS.md §8. Cached aggressively in TanStack Query. */

export interface ProvinceOption {
  code: string;
  description: string;
}

export interface HsCodeOption {
  code: string;
  description: string;
}

export interface UoMOption {
  id: string;
  description: string;
}

export interface RateOption {
  rateId: string;
  description: string;
  value: number;
}

export interface SroScheduleOption {
  sroId: string;
  description: string;
}

export interface SroItemOption {
  sroItemId: string;
  description: string;
}

export interface RegistrationTypeResult {
  registrationNo: string;
  registrationType: "Registered" | "Unregistered";
  isRegistered: boolean;
}

export interface StatlResult {
  statusCode: string;
  status: string;
  isActive: boolean;
}

export async function getProvinces(): Promise<ProvinceOption[]> {
  const res = await api.get<ProvinceOption[]>("/reference/provinces");
  return res.data;
}

export async function searchHsCodes(search: string): Promise<HsCodeOption[]> {
  const res = await api.get<HsCodeOption[]>("/reference/hs-codes", {
    params: { search },
  });
  return res.data;
}

export async function getUoMs(hsCode?: string): Promise<UoMOption[]> {
  const res = await api.get<UoMOption[]>("/reference/uom", {
    params: hsCode ? { hsCode } : undefined,
  });
  return res.data;
}

export interface RatesParams {
  date: string;
  transTypeId: string;
  originationSupplier?: string;
}

export async function getRates(params: RatesParams): Promise<RateOption[]> {
  const res = await api.get<RateOption[]>("/reference/rates", { params });
  return res.data;
}

export interface SroScheduleParams {
  rateId: string;
  date: string;
  originationSupplierCsv?: string;
}

export async function getSroSchedule(
  params: SroScheduleParams,
): Promise<SroScheduleOption[]> {
  const res = await api.get<SroScheduleOption[]>("/reference/sro-schedule", { params });
  return res.data;
}

export interface SroItemsParams {
  date: string;
  sroId: string;
}

export async function getSroItems(params: SroItemsParams): Promise<SroItemOption[]> {
  const res = await api.get<SroItemOption[]>("/reference/sro-items", { params });
  return res.data;
}

export async function checkRegistrationType(
  registrationNo: string,
): Promise<RegistrationTypeResult> {
  const res = await api.get<RegistrationTypeResult>("/reference/registration-type", {
    params: { registrationNo },
  });
  return res.data;
}

export async function checkStatl(regNo: string, date: string): Promise<StatlResult> {
  const res = await api.get<StatlResult>("/reference/statl", {
    params: { regNo, date },
  });
  return res.data;
}

export interface CityOption {
  name: string;
  provinceCode: string;
}

export async function getCities(province?: string): Promise<CityOption[]> {
  const res = await api.get<CityOption[]>("/reference/cities", {
    params: province ? { province } : undefined,
  });
  return res.data;
}
