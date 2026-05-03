import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  activateBranch,
  createBranch,
  deactivateBranch,
  getBranch,
  listBranches,
  updateBranch,
  type CreateBranchRequest,
  type UpdateBranchRequest,
} from "@/api/branches";
import type { PaginationParams } from "@/api/types";

const BRANCHES_KEY = "branches";
const BRANCH_KEY = "branch";

export function useBranchesList(params: PaginationParams) {
  return useQuery({
    queryKey: [BRANCHES_KEY, params],
    queryFn: () => listBranches(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useBranch(id: string | undefined) {
  return useQuery({
    queryKey: [BRANCH_KEY, id],
    queryFn: () => getBranch(id!),
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBranchRequest) => createBranch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BRANCHES_KEY] });
      toast.success("Branch created");
    },
  });
}

export function useUpdateBranch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBranchRequest) => updateBranch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BRANCHES_KEY] });
      qc.invalidateQueries({ queryKey: [BRANCH_KEY, id] });
      toast.success("Branch updated");
    },
  });
}

export function useToggleBranchActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activate }: { activate: boolean }) =>
      activate ? activateBranch(id) : deactivateBranch(id),
    onSuccess: (_d, { activate }) => {
      qc.invalidateQueries({ queryKey: [BRANCHES_KEY] });
      toast.success(activate ? "Branch activated" : "Branch deactivated");
    },
  });
}
