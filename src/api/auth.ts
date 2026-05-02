import { api } from "@/api/client";
import type { AuthResponse } from "@/api/types";

export interface LoginRequest {
  email: string;
  password: string;
}

export async function login(body: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", body);
  return res.data;
}

export async function refreshToken(body: {
  accessToken: string;
  refreshToken: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/refresh-token", body);
  return res.data;
}

export async function revokeToken(refreshTokenValue: string): Promise<void> {
  await api.post<null>("/auth/revoke-token", { refreshToken: refreshTokenValue });
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await api.post<null>("/auth/change-password", body);
}
