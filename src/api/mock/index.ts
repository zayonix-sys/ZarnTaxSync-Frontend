/**
 * Guest-mode mock router. Intercepts axios calls and returns canned data.
 *
 * TODO(guest-login): delete the entire `mock/` folder when guest mode is gone.
 *
 * Approach: register a custom axios adapter that, when `isGuest` is true,
 * matches the request method+URL against a registry of handlers. If a handler
 * matches, we return a synthetic response wrapped in the `ApiResponse<T>`
 * envelope so the existing response interceptor can unwrap it normally.
 */
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import type { ApiResponse, PaginationMeta } from "@/api/types";

export interface MockMatch {
  pathParams: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

export interface MockResult<T = unknown> {
  /** Response payload (will be wrapped in `{ success: true, data }`). */
  data: T;
  pagination?: PaginationMeta;
  status?: number;
  /** Optional artificial latency in ms (default 150ms for realism). */
  delayMs?: number;
}

type MockHandler<T = unknown> = (
  match: MockMatch,
  config: InternalAxiosRequestConfig,
) => MockResult<T> | Promise<MockResult<T>>;

interface RegisteredHandler {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: MockHandler;
}

const handlers: RegisteredHandler[] = [];

/**
 * Register a mock handler for `METHOD /path/with/:params`.
 * Path params are extracted into `match.pathParams`.
 */
export function mock<T = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  handler: MockHandler<T>,
): void {
  const paramNames: string[] = [];
  const regexBody = path
    .replace(/\/+$/, "")
    .replace(/:([a-zA-Z_]+)/g, (_, name: string) => {
      paramNames.push(name);
      return "([^/]+)";
    });
  const pattern = new RegExp(`^${regexBody}/?$`);
  handlers.push({
    method,
    pattern,
    paramNames,
    handler: handler as MockHandler,
  });
}

function parseUrl(rawUrl: string): { pathname: string; query: URLSearchParams } {
  const [pathname, qs = ""] = rawUrl.split("?");
  return { pathname: pathname.replace(/\/+$/, ""), query: new URLSearchParams(qs) };
}

function parseBody(config: InternalAxiosRequestConfig): unknown {
  if (config.data === undefined || config.data === null) return undefined;
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data);
    } catch {
      return config.data;
    }
  }
  return config.data;
}

async function delay(ms: number) {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

export async function tryMock(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse<ApiResponse<unknown>> | null> {
  const method = (config.method ?? "get").toUpperCase();
  const rawUrl = config.url ?? "";
  const { pathname, query } = parseUrl(rawUrl);

  for (const reg of handlers) {
    if (reg.method !== method) continue;
    const m = reg.pattern.exec(pathname);
    if (!m) continue;

    const pathParams: Record<string, string> = {};
    reg.paramNames.forEach((name, i) => {
      pathParams[name] = decodeURIComponent(m[i + 1]);
    });

    const result = await reg.handler(
      { pathParams, query, body: parseBody(config) },
      config,
    );

    await delay(result.delayMs ?? 120);

    const envelope: ApiResponse<unknown> = {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };

    return {
      data: envelope,
      status: result.status ?? 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      config,
      request: {},
    } as AxiosResponse<ApiResponse<unknown>>;
  }

  return null;
}

/**
 * Wrap a base axios adapter so guest-mode calls are short-circuited.
 * If no handler matches, the call falls through to the real adapter.
 */
export function withMockAdapter(real: AxiosAdapter): AxiosAdapter {
  return async (config) => {
    // Lazy import to avoid circular dep with the auth store.
    const { useAuthStore } = await import("@/stores/auth");
    if (!useAuthStore.getState().isGuest) return real(config);

    const mocked = await tryMock(config);
    if (mocked) return mocked;
    // Unhandled guest-mode call: fail fast with a friendly error rather than
    // hitting the real backend (which the dev probably doesn't have running).
    return Promise.reject({
      isAxiosError: true,
      config,
      response: {
        status: 501,
        statusText: "Not Implemented (guest mock)",
        data: {
          success: false,
          message: `No guest mock handler for ${config.method?.toUpperCase()} ${config.url}`,
          errors: [],
        },
        headers: {},
        config,
      },
      message: "Mock not implemented for this endpoint.",
      toJSON: () => ({}),
    });
  };
}
