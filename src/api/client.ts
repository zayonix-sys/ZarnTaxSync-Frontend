import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";

import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/auth";
import type { ApiResponse, AuthResponse, NormalizedError } from "@/api/types";

/**
 * Single shared axios instance. Behavior:
 * 1. Request: attach `Authorization: Bearer {accessToken}` from zustand.
 * 2. Response: unwrap `{ data: T }` envelope so callers receive `T` directly.
 *    For paginated lists, pagination meta is preserved on `response.pagination`.
 * 3. 401 → silently call /auth/refresh-token, replay original request once.
 *    On refresh failure → clear store + redirect to /login.
 * 4. Other errors → `normalizeError()` produces a typed error for callers.
 */

const REFRESH_PATH = "/auth/refresh-token";
const LOGIN_PATH = "/auth/login";

/** Internal flag to mark requests we've already retried, preventing infinite loops. */
type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  withCredentials: true, // for httpOnly refresh cookie when backend ships it
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 30_000,
});

// --------------------------- Request interceptor ---------------------------

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// --------------------------- Response interceptor --------------------------

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { accessToken, refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    clear();
    return null;
  }
  try {
    // Bypass interceptors by using a fresh axios call to avoid recursion.
    const res = await axios.post<ApiResponse<AuthResponse>>(
      `${env.VITE_API_BASE_URL}${REFRESH_PATH}`,
      { accessToken, refreshToken },
      { withCredentials: true },
    );
    const payload = res.data?.data;
    if (!payload?.accessToken) {
      clear();
      return null;
    }
    setSession(payload);
    return payload.accessToken;
  } catch {
    clear();
    return null;
  }
}

api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      // Preserve pagination meta on the response for list callers.
      const unwrapped = body.data;
      const augmented = response as AxiosResponse<unknown> & {
        pagination?: ApiResponse<unknown>["pagination"];
      };
      augmented.data = unwrapped as never;
      augmented.pagination = body.pagination;
      return augmented;
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;

    // 401 → try refresh-replay (skip the refresh and login endpoints themselves).
    const isAuthEndpoint =
      original?.url?.endsWith(REFRESH_PATH) || original?.url?.endsWith(LOGIN_PATH);
    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      refreshInFlight = refreshInFlight ?? performRefresh();
      const newToken = await refreshInFlight;
      refreshInFlight = null;

      if (newToken) {
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        original.headers = headers;
        return api.request(original);
      }
      // Hard fail → redirect.
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search;
        const target = `/login?redirect=${encodeURIComponent(currentPath)}`;
        if (!window.location.pathname.startsWith("/login")) {
          window.location.assign(target);
        }
      }
    }

    showStatusToast(error);
    return Promise.reject(normalizeError(error));
  },
);

// --------------------------- Error normalization ---------------------------

export function normalizeError(error: unknown): NormalizedError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data as ApiResponse<unknown> | undefined;
    const errors = Array.isArray(body?.errors) ? body!.errors : [];
    const message =
      body?.message ||
      errors[0] ||
      error.message ||
      "An unexpected error occurred.";
    const correlationId =
      (error.response?.headers?.["x-correlation-id"] as string | undefined) ??
      (error.response?.headers?.["correlation-id"] as string | undefined);
    return {
      status,
      message,
      errors,
      correlationId,
      isNetworkError: !error.response,
    };
  }
  if (error instanceof Error) {
    return { status: 0, message: error.message, errors: [] };
  }
  return { status: 0, message: "Unknown error", errors: [] };
}

function showStatusToast(error: AxiosError<ApiResponse<unknown>>) {
  const status = error.response?.status;
  const original = error.config as RetryConfig | undefined;
  const isAuthEndpoint =
    original?.url?.endsWith(REFRESH_PATH) || original?.url?.endsWith(LOGIN_PATH);
  // Skip 400/422 — caller surfaces inline form errors.
  // Skip 401 — handled silently by refresh interceptor.
  if (status === 400 || status === 422 || status === 401 || isAuthEndpoint) return;

  const correlationId = error.response?.headers?.["x-correlation-id"] as string | undefined;
  switch (status) {
    case 403:
      toast.error("You don't have permission to do that.");
      break;
    case 409:
      toast.warning("Record was just modified — refresh and try again.");
      break;
    case 429: {
      const retryAfter = Number(error.response?.headers?.["retry-after"] ?? 60);
      toast.warning(`Too many requests. Retry in ${retryAfter}s.`);
      break;
    }
    case 502:
      toast.error("FBR unreachable — save as draft or retry.");
      break;
    case 503:
      toast.error("FBR temporarily unavailable. Wait 30 seconds.");
      break;
    default:
      if (status && status >= 500) {
        toast.error(
          correlationId
            ? `Server error (ref: ${correlationId})`
            : "Server error. Please try again.",
        );
      } else if (!error.response) {
        toast.error("Network error — check your connection.");
      }
  }
}

// --------------------------- Helpers ---------------------------------------

/** Type-safe paginated GET wrapper. Returns items + pagination meta together. */
export async function getPaged<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ items: T[]; pagination: NonNullable<ApiResponse<unknown>["pagination"]> }> {
  const res = (await api.get<T[]>(url, config)) as AxiosResponse<T[]> & {
    pagination?: ApiResponse<unknown>["pagination"];
  };
  return {
    items: Array.isArray(res.data) ? res.data : [],
    pagination:
      res.pagination ?? {
        pageNumber: 1,
        pageSize: res.data?.length ?? 0,
        totalCount: res.data?.length ?? 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
  };
}
