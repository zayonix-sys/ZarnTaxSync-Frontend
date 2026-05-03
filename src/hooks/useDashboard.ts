import { useQuery } from "@tanstack/react-query";

import { getDashboard, getReportsTokenStatus } from "@/api/reports";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    staleTime: 30_000,
  });
}

export function useReportsTokenStatus() {
  return useQuery({
    queryKey: ["reports-token-status"],
    queryFn: getReportsTokenStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
