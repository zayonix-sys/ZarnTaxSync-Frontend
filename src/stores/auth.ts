import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { AuthResponse, Role, User } from "@/api/types";
import { ROLE_HIERARCHY } from "@/api/types";

/**
 * Auth state.
 *
 * Token storage strategy (per Frontend Stack & Implementation Plan, Phase 1):
 * - Access token: zustand memory only (NEVER localStorage in production — XSS risk).
 * - Refresh token: httpOnly cookie via `axios.defaults.withCredentials = true`.
 * - Dev fallback: persist to localStorage so reloads don't drop the session
 *   while the backend is being wired up. Replace with an in-memory store once
 *   the backend ships `Set-Cookie` for refresh tokens.
 */

const PERSIST_DEV_FALLBACK = true; // flip to `false` once httpOnly cookie ships

// TODO(guest-login): remove `GUEST_USER`, `GUEST_AUTH`, `isGuest` flag, and
// `loginAsGuest` action once the backend auth flow is wired up end-to-end.
const GUEST_USER: User = {
  id: "guest-user",
  firstName: "Guest",
  lastName: "User",
  fullName: "Guest User",
  email: "guest@zarntaxsync.local",
  role: "SuperAdmin",
  tenantId: "guest-tenant",
  branchId: null,
  isActive: true,
};

const GUEST_AUTH: AuthResponse = {
  accessToken: "guest.access.token",
  refreshToken: "guest.refresh.token",
  accessTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  user: GUEST_USER,
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiry: string | null;
  /** TODO(guest-login): remove once the real backend session is the only path in. */
  isGuest: boolean;
  setSession: (auth: AuthResponse) => void;
  setUser: (user: User) => void;
  /** TODO(guest-login): remove. */
  loginAsGuest: () => void;
  clear: () => void;
  hasRoleAtLeast: (min: Role) => boolean;
}

const baseStore = (
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
): AuthState => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  accessTokenExpiry: null,
  isGuest: false,

  setSession: (auth) =>
    set({
      user: auth.user,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      accessTokenExpiry: auth.accessTokenExpiry,
      isGuest: false,
    }),

  setUser: (user) => set({ user }),

  // TODO(guest-login): remove this entire action and its call site in `login.tsx`
  // once the backend auth flow is the only entry point.
  loginAsGuest: () =>
    set({
      user: GUEST_AUTH.user,
      accessToken: GUEST_AUTH.accessToken,
      refreshToken: GUEST_AUTH.refreshToken,
      accessTokenExpiry: GUEST_AUTH.accessTokenExpiry,
      isGuest: true,
    }),

  clear: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiry: null,
      isGuest: false,
    }),

  hasRoleAtLeast: (min) => {
    const role = get().user?.role;
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[min];
  },
});

export const useAuthStore = PERSIST_DEV_FALLBACK
  ? create<AuthState>()(
      persist(baseStore, {
        name: "zts.auth",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          accessTokenExpiry: state.accessTokenExpiry,
          // TODO(guest-login): drop `isGuest` from persisted shape on removal.
          isGuest: state.isGuest,
        }),
      }),
    )
  : create<AuthState>()(baseStore);

export const isAuthenticated = () =>
  Boolean(useAuthStore.getState().accessToken && useAuthStore.getState().user);
