import { useQuery } from "@tanstack/react-query";

import {
  checkRegistrationType,
  checkStatl,
  getCities,
  getProvinces,
  getRates,
  getSroItems,
  getSroSchedule,
  getUoMs,
  searchHsCodes,
  type RatesParams,
  type SroItemsParams,
  type SroScheduleParams,
} from "@/api/reference";

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export function useProvinces() {
  return useQuery({
    queryKey: ["reference", "provinces"],
    queryFn: getProvinces,
    staleTime: ONE_DAY,
  });
}

export function useHsCodes(search: string) {
  return useQuery({
    queryKey: ["reference", "hs-codes", search],
    queryFn: () => searchHsCodes(search),
    enabled: search.length >= 2,
    staleTime: ONE_HOUR,
  });
}

export function useUoMs(hsCode?: string) {
  return useQuery({
    queryKey: ["reference", "uom", hsCode ?? null],
    queryFn: () => getUoMs(hsCode),
    staleTime: ONE_HOUR,
  });
}

export function useRates(params: RatesParams | null) {
  return useQuery({
    queryKey: ["reference", "rates", params],
    queryFn: () => getRates(params!),
    enabled: !!params,
    staleTime: ONE_HOUR,
  });
}

export function useSroSchedule(params: SroScheduleParams | null) {
  return useQuery({
    queryKey: ["reference", "sro-schedule", params],
    queryFn: () => getSroSchedule(params!),
    enabled: !!params,
    staleTime: ONE_HOUR,
  });
}

export function useSroItems(params: SroItemsParams | null) {
  return useQuery({
    queryKey: ["reference", "sro-items", params],
    queryFn: () => getSroItems(params!),
    enabled: !!params,
    staleTime: ONE_HOUR,
  });
}

export function useRegistrationCheck(registrationNo: string | null) {
  return useQuery({
    queryKey: ["reference", "registration-type", registrationNo],
    queryFn: () => checkRegistrationType(registrationNo!),
    enabled: !!registrationNo && registrationNo.length >= 7,
    staleTime: 0,
    retry: false,
  });
}

export function useStatlCheck(regNo: string | null, date: string) {
  return useQuery({
    queryKey: ["reference", "statl", regNo, date],
    queryFn: () => checkStatl(regNo!, date),
    enabled: !!regNo && regNo.length >= 7 && !!date,
    staleTime: 0,
    retry: false,
  });
}

export function useCities(provinceCode?: string | null) {
  return useQuery({
    queryKey: ["reference", "cities", provinceCode ?? null],
    queryFn: () => getCities(provinceCode ?? undefined),
    staleTime: ONE_DAY,
  });
}
