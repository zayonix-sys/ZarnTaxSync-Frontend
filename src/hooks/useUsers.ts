import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  activateUser,
  changeUserRole,
  createApiKey,
  createUser,
  deactivateUser,
  getUser,
  listApiKeys,
  listUsers,
  revokeApiKey,
  unlockUser,
  updateUser,
  type CreateApiKeyRequest,
  type CreateUserRequest,
  type ListUsersParams,
  type UpdateUserRequest,
} from "@/api/users";
import type { Role } from "@/api/types";

const USERS_KEY = "users";
const USER_KEY = "user";
const API_KEYS_KEY = "user-api-keys";

export function useUsersList(params: ListUsersParams) {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: [USER_KEY, id],
    queryFn: () => getUser(id!),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => createUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("User created");
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserRequest) => updateUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USER_KEY, id] });
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("User updated");
    },
  });
}

export function useChangeUserRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: Role) => changeUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USER_KEY, id] });
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success("Role updated — takes effect on next login");
    },
  });
}

export function useToggleUserActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activate }: { activate: boolean }) =>
      activate ? activateUser(id) : deactivateUser(id),
    onSuccess: (_d, { activate }) => {
      qc.invalidateQueries({ queryKey: [USER_KEY, id] });
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      toast.success(activate ? "User activated" : "User deactivated");
    },
  });
}

export function useUnlockUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unlockUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USER_KEY, id] });
      toast.success("User unlocked");
    },
  });
}

export function useApiKeys(userId: string | undefined) {
  return useQuery({
    queryKey: [API_KEYS_KEY, userId],
    queryFn: () => listApiKeys(userId!),
    enabled: !!userId,
  });
}

export function useCreateApiKey(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiKeyRequest) => createApiKey(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [API_KEYS_KEY, userId] });
    },
  });
}

export function useRevokeApiKey(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => revokeApiKey(userId, keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [API_KEYS_KEY, userId] });
      toast.success("API key revoked");
    },
  });
}
