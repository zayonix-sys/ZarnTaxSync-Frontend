import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { BusinessActivity, Sector } from "@/lib/scenarioMatrix";

/**
 * Local stand-in for tenant business activity / sector.
 *
 * Backend gap N4 (BusinessType field on the tenant DTO) is not yet shipped.
 * Phase 3's scenario filter depends on these fields, so we persist them
 * locally per tenant id until the backend ships them. Once N4 lands:
 *   1. Update the tenant DTO in `src/api/types.ts` to include them.
 *   2. Read/write through `PUT /api/v1/tenants/{id}` instead of this store.
 *   3. Delete this file.
 */

interface TenantProfile {
  businessActivity?: BusinessActivity;
  sector?: Sector;
  /** Display name cached for nav UX. */
  name?: string;
}

interface TenantProfileState {
  profiles: Record<string, TenantProfile>;
  setProfile: (tenantId: string, profile: TenantProfile) => void;
  getProfile: (tenantId: string) => TenantProfile | undefined;
}

export const useTenantProfileStore = create<TenantProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},
      setProfile: (tenantId, profile) =>
        set((s) => ({
          profiles: {
            ...s.profiles,
            [tenantId]: { ...s.profiles[tenantId], ...profile },
          },
        })),
      getProfile: (tenantId) => get().profiles[tenantId],
    }),
    {
      name: "zts.tenantProfile.n4",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
