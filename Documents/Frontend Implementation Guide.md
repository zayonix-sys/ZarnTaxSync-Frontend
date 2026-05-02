# ZarnTaxSync — Frontend Implementation Guide

**Audience:** Frontend developer (the person building the React UI)
**Backend:** ZarnTaxSync API — `https://api.your-domain.com/api/v1`
**Document version:** 1.0 — 25 April 2026

> Self-contained. You don't need to read backend source. Everything you'll consume is summarized here, with example payloads.
> Pair this with the **Backend Functional Guide** for business context, and the **Technical Reference** when you need exact DTO field-by-field detail.

---

## 1. Recommended stack

| Concern | Pick | Why |
|---|---|---|
| Build tool | **Vite 5+** | Fast HMR, sane defaults, the standard SPA bundler |
| UI framework | **React 18 + TypeScript (strict)** | Stable, vast ecosystem |
| Routing | **TanStack Router** | Type-safe routes, file-based, integrates with TanStack Query |
| Server state | **TanStack Query (React Query) v5** | Cache, dedupe, retry, optimistic updates — replaces 90% of Redux |
| Tables | **TanStack Table v8** | You'll have heavy data grids on Invoices, Audit Logs, Submissions — this handles them |
| Forms | **react-hook-form + zod** | Performant, schema-first validation; mirror server FluentValidation rules |
| HTTP | **axios** + interceptors | JWT refresh, error normalization |
| Local UI state | **zustand** | One file, two hooks. Don't reach for Redux |
| Component library | **shadcn/ui + Radix + TailwindCSS** | Copy-paste components you own. No runtime lock-in |
| Toasts | **sonner** (or `react-hot-toast`) | Lightweight |
| PDF preview | Use the browser — `<embed src="..."/>` from the `/pdf` endpoint URL |
| Charts | **recharts** | Sufficient for the dashboard line/bar charts |
| Date | **date-fns** | Tree-shakeable; the API uses ISO 8601 throughout |
| Icons | **lucide-react** | Pairs naturally with shadcn |

> **Do not use TanStack Start** (the meta-framework) for this app. SSR adds complexity you don't need for an authenticated B2B admin panel under deadline pressure. Revisit in 12 months.

### Why this combo
- TanStack Query owns **server state**; zustand owns **UI state**. No Redux.
- shadcn/ui means no `npm install component-library` — you generate the components into your repo and customize freely.
- TanStack Router gives you type-safe params and search params, so the invoices list (`?status=&fromDate=&toDate=&page=`) is statically checked.

---

## 2. Project structure

```
zarntaxsync-web/
├── src/
│   ├── main.tsx
│   ├── routes/                          # TanStack Router file-based routes
│   │   ├── __root.tsx
│   │   ├── _auth.tsx                    # Layout: redirect to /login if no token
│   │   ├── _auth.dashboard.tsx
│   │   ├── _auth.invoices.index.tsx
│   │   ├── _auth.invoices.new.tsx
│   │   ├── _auth.invoices.$id.tsx
│   │   ├── _auth.scenarios.tsx
│   │   ├── _auth.tenants.tsx            # SuperAdmin only
│   │   ├── login.tsx
│   │   └── ...
│   ├── api/
│   │   ├── client.ts                    # axios instance + interceptors
│   │   ├── auth.ts                      # login / refresh / logout
│   │   ├── invoices.ts                  # post / validate / list / pdf / cancel
│   │   ├── tenants.ts
│   │   ├── branches.ts
│   │   ├── users.ts
│   │   ├── reference.ts
│   │   ├── reports.ts
│   │   ├── scenarios.ts
│   │   ├── auditLogs.ts
│   │   ├── products.ts
│   │   └── types.ts                     # Shared TS types — mirror DTOs
│   ├── hooks/                           # Domain hooks built on TanStack Query
│   │   ├── useInvoices.ts
│   │   ├── useReference.ts
│   │   ├── useDashboard.ts
│   │   └── ...
│   ├── components/
│   │   ├── ui/                          # shadcn components
│   │   ├── invoice/
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── InvoiceItemsTable.tsx
│   │   │   └── InvoiceStatusBadge.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   └── common/
│   ├── stores/
│   │   └── auth.ts                      # zustand: current user + tokens
│   ├── lib/
│   │   ├── format.ts                    # currency, date, NTN/CNIC display
│   │   └── env.ts                       # validated env vars
│   └── styles/
└── .env
```

---

## 3. Environment variables

Frontend reads these at build time (Vite convention: `VITE_*`):

```
VITE_API_BASE_URL=http://localhost:5000/api/v1     # dev
VITE_API_BASE_URL=https://api.your-domain.com/api/v1   # prod
VITE_APP_NAME=ZarnTaxSync
```

Backend CORS must include the frontend origin:
- Dev: `http://localhost:5173`
- Prod: `https://app.your-domain.com`

---

## 4. Response envelope (every endpoint)

```ts
// src/api/types.ts
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: string[];
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
```

Always reach for `response.data.data` (axios → ApiResponse → payload). Wrap this in your axios interceptor so callers receive the unwrapped payload.

---

## 5. Authentication

### Login flow

```
POST /api/v1/auth/login
Body: { email, password }
Response (200):
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "rJfdSm...",
    "accessTokenExpiry": "2026-04-25T10:15:00Z",
    "user": {
      "id": "guid", "firstName": "...", "lastName": "...",
      "fullName": "...", "email": "...", "role": "Operator",
      "tenantId": "guid", "branchId": "guid", "isActive": true
    }
  }
}
```

### Storage strategy
- **Access token:** in memory (zustand store) — never localStorage (XSS exposure)
- **Refresh token:** httpOnly cookie if you can configure the server, otherwise localStorage with awareness of risk
- **Current user:** zustand store, hydrated from `AuthResponse.user`

### Refresh flow
- Access token expires in 15 min (production) / 60 min (dev)
- The server returns header `Token-Expired: true` on a request with an expired JWT
- Axios response interceptor on 401: call `POST /auth/refresh-token` with `{ accessToken, refreshToken }`, swap tokens, replay the original request
- On refresh failure: clear store, navigate to `/login`

### Other auth endpoints
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/auth/refresh-token` | `{ accessToken, refreshToken }` | Returns new pair |
| POST | `/auth/revoke-token` | `{ refreshToken }` | Logout |
| POST | `/auth/change-password` | `{ currentPassword, newPassword, confirmNewPassword }` | |
| POST | `/auth/register` | TenantAdmin/SuperAdmin only — alias of `POST /users` |

> **Gap:** there is no `GET /auth/me`. You must cache `AuthResponse.user` and re-login or refresh-token to get a fresh copy after role changes. The backend doc lists this as N1 (post go-live).

### Rate limit
`POST /auth/login` and `POST /auth/refresh-token` are limited to **10 requests/minute per IP**. Show a "Too many login attempts, retry in 60s" toast on HTTP 429.

---

## 6. Axios setup

```ts
// src/api/client.ts
import axios, { AxiosError } from "axios";
import { useAuth } from "@/stores/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data, // unwrap ApiResponse
  async (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401 && !error.config?._retried) {
      // Try refresh once
      const refreshed = await useAuth.getState().refresh();
      if (refreshed) {
        error.config!._retried = true;
        return api(error.config!);
      }
      useAuth.getState().clear();
      window.location.href = "/login";
    }
    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(err: AxiosError<ApiResponse<unknown>>) {
  return {
    status: err.response?.status,
    message: err.response?.data?.message ?? err.message,
    errors: err.response?.data?.errors ?? [],
    correlationId: err.response?.headers["x-correlation-id"],
  };
}
```

### HTTP → toast mapping

| Status | Display |
|---|---|
| 400 / 422 | Show inline form errors from `errors[]` (format `"Field: message"` from server) |
| 401 | Auto-refresh attempted; on failure → redirect to login |
| 403 | Toast "You don't have permission" |
| 404 | Empty-state UI |
| 409 | Toast "This record was just modified — refresh and try again" |
| 422 with `Code: COMPLIANCE_FAILED` | Show in form's compliance section |
| 422 with `Code: FINANCIAL_INTEGRITY_FAILED` | Show "Totals don't match — recalculated server-side" |
| 502 | Toast "FBR is unreachable. Try again or save as draft" |
| 503 | Toast "FBR temporarily unavailable. Wait 30 seconds" |
| 429 | Toast with retry-after countdown |
| 5xx | Toast with `correlationId` so the user can quote it |

---

## 7. Page-by-page integration map

### 7.1 Login (`/login`)
- POST `/auth/login`
- On success: store tokens + user, navigate to `/dashboard` (or last-attempted route)

### 7.2 Dashboard (`/dashboard`)
- GET `/reports/dashboard` → `{ submittedToday, failedToday, pendingToday, deferredToday, last7Days[] }`
- GET `/reports/token-status` → status badge in topbar
- Recharts: bar chart of `last7Days`, KPI cards for the 4 today counts

### 7.3 Invoices list (`/invoices`)
- GET `/di?page=&pageSize=&status=&invoiceType=&fromDate=&toDate=&search=`
- Returns `PagedResult<InvoiceListItem>`
- TanStack Table with server-side pagination + filters; persist filters in URL search params via TanStack Router

```ts
interface InvoiceListItem {
  id: string;
  fbrInvoiceNumber: string | null;
  invoiceType: "SaleInvoice" | "DebitNote";
  invoiceDate: string;          // "yyyy-MM-dd"
  sellerNtnCnic: string;
  sellerBusinessName: string;
  buyerBusinessName: string;
  buyerRegistrationType: "Registered" | "Unregistered";
  status: "Draft" | "Pending" | "Submitted" | "Failed" | "Cancelled";
  itemCount: number;
  totalSalesExcludingSt: number;
  totalSalesTax: number;
  createdAt: string;
  submittedAt: string | null;
}
```

### 7.4 Create / submit invoice (`/invoices/new`)

**Pre-load on form mount (parallel):**
- GET `/reference/provinces`
- GET `/reference/hs-codes` (lazy — load on user search)
- GET `/branches` (for branch picker if user is TenantAdmin)
- GET `/products` (optional — pre-fill HS code from product)

**Per-line:**
- GET `/reference/uom?hsCode=...` — populate UoM dropdown when HS changes
- GET `/reference/rates?date=&transTypeId=&originationSupplier=` — populate rate options
- GET `/reference/sro-schedule?rateId=&date=` — only if SRO applies
- GET `/reference/sro-items?date=&sroId=` — only if SRO applies

**Pre-flight (optional but recommended UI step):**
- POST `/di/validateinvoicedata` with the same body as submit — surface item-level errors before issuing IRN

**Submit:**
- POST `/di/postinvoicedata`
- Header: `Idempotency-Key: <UUID generated client-side, persisted with form state>`
- On success: navigate to `/invoices/{id}` with toast showing IRN

```ts
interface PostInvoiceRequest {
  invoiceType: "Sale Invoice" | "Debit Note" | "Credit Note";
  invoiceDate: string;          // "yyyy-MM-dd"
  sellerNtnCnic: string;
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
  buyerNtnCnic?: string | null;
  buyerBusinessName: string;
  buyerProvince: string;
  buyerAddress: string;
  buyerRegistrationType: "Registered" | "Unregistered";
  invoiceRefNo?: string;        // required for Debit Note (22 or 28 digits)
  scenarioId?: string;          // sandbox only — "SN001".."SN028"
  saleType: string;
  totalQuantity: number;
  totalSalesTax: number;
  totalBillAmount: number;
  items: InvoiceItemRequest[];

  // ⚠️ COMING SOON (backend gap B2 — not in DTO yet):
  // debitNoteReason?: string;
  // debitNoteReasonRemarks?: string;
}

interface InvoiceItemRequest {
  itemSequence: number;
  hsCode: string;
  productDescription: string;
  rate: string;                 // "18%"
  uoM: string;                  // "Numbers, pieces, units"
  quantity: number;
  totalValues: number;
  valueSalesExcludingSt: number;
  fixedNotifiedValueOrRetailPrice: number;
  salesTaxApplicable: number;
  salesTaxWithheldAtSource: number;
  extraTax: number;
  furtherTax: number;
  sroScheduleNo?: string | null;
  fedPayable: number;
  discount: number;
  saleType: string;
  sroItemSerialNo?: string | null;
}

interface PostInvoiceResponse {
  localInvoiceId: string;
  fbrInvoiceNumber: string | null;
  status: "Draft" | "Pending" | "Submitted" | "Failed" | "Cancelled";
  fbrStatusCode: string | null;
  fbrStatusMessage: string | null;
  submittedAt: string | null;
  itemStatuses: {
    itemSequence: number;
    fbrItemInvoiceNo: string | null;
    fbrItemStatusCode: string | null;
    fbrItemErrorCode: string | null;
    fbrItemError: string | null;
  }[];
}
```

> **Server-side checks the form must surface gracefully:**
> 1. **FluentValidation** — field-level (e.g. "InvoiceDate is required")
> 2. **Compliance engine** (`COMPLIANCE_FAILED`) — show in a "Compliance" section, e.g. "Province must be UPPERCASE"
> 3. **Financial integrity** (`FINANCIAL_INTEGRITY_FAILED`) — show "Header totals do not match line items. Recalculate?" with a button to refresh totals from items
> 4. **FBR rejection** — `status = Failed`, show `fbrStatusMessage` and `fbrItemError` per item

### 7.5 Invoice detail (`/invoices/{id}`)
- GET `/di/{id}` → full `InvoiceResponse` with items
- GET `/di/{id}/submission-logs` — accordion of attempts with raw FBR JSON
- Buttons:
  - "Download PDF" → `GET /di/{id}/pdf` (open in new tab; backend returns `application/pdf`)
  - "Cancel" (if Draft or Failed; BranchManager+) → `POST /di/{id}/cancel`
  - "Retry" (if Failed) → ❌ endpoint not built yet (B2 in backend plan); hide for now
- "Look up by IRN" (search bar) → `GET /di/by-irn/{irn}`

### 7.6 Bulk Excel upload (`/invoices/upload`)
- Drag-drop `.xlsx`
- POST `/di/upload-excel` (multipart) with `autoSubmit` checkbox
- Response 202: `{ jobId, totalRows, status: "Processing" }`
- ⚠️ No status endpoint yet (H2 in backend plan). For now, redirect to `/invoices?status=Pending` and instruct the user to refresh

### 7.7 Reference data (used as dropdowns, not standalone pages)
Cache in TanStack Query with `staleTime: 24 * 60 * 60 * 1000` (1 day) — these change rarely.

| Endpoint | Stable? | Cache strategy |
|---|---|---|
| `/reference/provinces` | Yes | 24h |
| `/reference/hs-codes?search=` | Yes | 1h, key by search term |
| `/reference/uom?hsCode=` | Yes per HS | 1h, key by hsCode |
| `/reference/rates` | Daily | 1h, key by params |
| `/reference/sro-schedule` | Daily | 1h, key by params |
| `/reference/sro-items` | Daily | 1h, key by params |
| `/reference/statl?regNo=&date=` | Live check | No cache |
| `/reference/registration-type?registrationNo=` | Live check | No cache |

### 7.8 Tenants (`/tenants` — SuperAdmin only)
- GET `/tenants` (paginated)
- POST `/tenants` (form: name, subdomain, ntnCnic, planType)
- GET `/tenants/{id}/settings` + PUT `/tenants/{id}/settings` (key/value/encrypted)
- PUT `/tenants/{id}/token/sandbox`, `/token/production` — token + expiry inputs
- PUT `/tenants/{id}/environment` — radio Sandbox/Production
- GET `/tenants/{id}/token-status` — display "Active env: Production · Expires in 312 days"

### 7.9 Branches (`/branches`)
- GET `/branches` (paginated)
- POST / PUT / activate / deactivate
- Note: head office cannot be deactivated — show disabled button + tooltip

### 7.10 Users (`/users`)
- GET `/users?branchId=` (BranchManager+)
- POST `/users` (TenantAdmin+) — `{ firstName, lastName, email, password, branchId, role }` where role is enum index 1–5
- POST `/users/{id}/change-role`
- POST `/users/{id}/{deactivate | activate | unlock}`

#### API Keys (sub-page of user detail)
- GET `/users/{id}/api-keys`
- POST `/users/{id}/api-keys` → response includes `rawKey` **only this one time** — show a one-time copy modal with a checkbox "I've saved this key" before letting the user dismiss
- POST `/users/{id}/api-keys/{keyId}/revoke`

### 7.11 Scenario testing (`/scenarios`)
- GET `/di/scenarios` → 28 rows with status (Pending/Passed/Failed) + last run + certified date
- GET `/di/scenarios/summary` → progress card
- POST `/di/scenarios/{id}/run` (BranchManager+) — long-running; show spinner; refetch list on completion
- PUT `/di/scenarios/{id}/certify` (TenantAdmin+) — only if Passed
- ⚠️ **Backend gap B1**: scenario payloads are placeholders; expect FBR rejections until backend B1 is delivered. Show a banner during sandbox phase explaining this.

### 7.12 Reports (`/reports`)
- `/reports/dashboard` — already on home dashboard
- `/reports/compliance?annualTurnover=` — input box; show 150Q badge + penalty risk
- `/reports/failed-invoices` — paginated table with link to invoice detail

### 7.13 Audit logs (`/audit-logs` — BranchManager+)
- GET `/audit-logs?entityType=&entityId=&dateFrom=&dateTo=&page=&pageSize=`
- Render `oldValues` / `newValues` JSON in a side-by-side diff component
- Optional: GET `/audit-logs/entity/{entityType}/{entityId}` deep-link from any record's "History" button

### 7.14 Products (`/products`)
- Standard CRUD + CSV import via `POST /products/import-csv` (multipart)

---

## 8. Form patterns

### Validation alignment
Mirror server FluentValidation in zod. Examples:

```ts
const invoiceSchema = z.object({
  invoiceType: z.enum(["Sale Invoice", "Debit Note"]),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sellerNtnCnic: z.string().refine(
    (v) => v.length === 7 || v.length === 9 || v.length === 13,
    "NTN must be 7 or 9 digits, CNIC must be 13"
  ),
  buyerProvince: z.string().min(1),
  invoiceRefNo: z.string()
    .refine((v) => !v || v.length === 22 || v.length === 28,
      "Reference number must be 22 or 28 digits")
    .optional(),
  items: z.array(itemSchema).min(1, "At least one line item required"),
});
```

The server is the source of truth — **always re-display server errors** even when client validation passes (compliance + financial integrity rules can only fire server-side).

### Idempotency keys for invoice submit
Generate one when the form mounts, persist with the form state (so a page reload reuses it):

```ts
const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
api.post("/di/postinvoicedata", body, {
  headers: { "Idempotency-Key": idempotencyKey },
});
```

If the user clicks Submit twice, the server returns the cached first response — no duplicate FBR submission.

---

## 9. Role-based UI gating

Mirror the backend `[Authorize(Roles = "...")]` rules in the UI. The user's role lives in `useAuth().user.role`.

| Section | Min role |
|---|---|
| Tenants | SuperAdmin |
| User management | TenantAdmin |
| Branch management | TenantAdmin |
| API key creation | TenantAdmin |
| Audit logs | BranchManager |
| Scenario certify | TenantAdmin |
| Scenario run | BranchManager |
| Cancel invoice | BranchManager |
| Submit invoice | Operator |
| Read everything else | Viewer |

Wrap with a `<RequireRole min="Operator">` component that hides children + shows a tooltip if the user is below.

> **Defense in depth:** UI gating is UX, not security. The server enforces these on every endpoint. Don't over-engineer the client-side check.

---

## 10. UX guidelines specific to this domain

- **Always show the IRN prominently** when an invoice is `Submitted`. It's the legally required artifact.
- **QR code preview**: when on the invoice detail page, the PDF is the source of truth — link to `/di/{id}/pdf` rather than re-rendering the QR client-side.
- **Status badges:**
  - Draft = gray
  - Pending = amber (with pulsing indicator)
  - Submitted = green (with IRN as tooltip)
  - Failed = red (with error message as tooltip; clickable to view submission logs)
  - Cancelled = neutral strikethrough
- **Sandbox banner**: read tenant token status; if `environment === "Sandbox"`, show a yellow banner across the top: "Sandbox mode — invoices not submitted to live FBR."
- **Compliance deadline reminder**: hard-coded April 2026 has passed. Show a one-time onboarding modal explaining this to TenantAdmins.
- **Currency formatting**: PKR. Use `Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' })`.
- **NTN/CNIC display**: format with hyphens (e.g. `12345-6789012-3` for CNIC) but **send raw digits** to the API.

---

## 11. Things the backend does NOT have yet (don't build UI for these — they're listed in the backend plan)

| Missing | Backend plan ID | Workaround |
|---|---|---|
| Manual retry of `Failed` invoice | H1 | Hide the Retry button for now |
| Excel upload status endpoint | H2 | After upload, redirect to `?status=Pending` filter |
| Webhook signature + test endpoint | H3 | Skip the test-fire button for now |
| Document Type / Transaction Type lookups | H4 | Hard-code transTypeId in rate calls (backend will fix) |
| `Deferred` invoice status | H5 | The dashboard `deferredToday` will be 0; that's fine |
| `GET /auth/me` | N1 | Cache `AuthResponse.user` in zustand |
| Password reset email | N2 | Admin-only "reset password" by changing it |
| Debit Note `Reason` / `ReasonRemarks` | B2 | Backend blocker — when added, `PostInvoiceRequest` will gain two fields |

---

## 12. Build / deploy

### Vite config highlights
```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  server: { port: 5173, host: true },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          tanstack: ["@tanstack/react-query", "@tanstack/react-router", "@tanstack/react-table"],
        },
      },
    },
  },
});
```

### Production hosting options (in order of simplicity)
1. **Static host** (Vercel, Netlify, Cloudflare Pages, S3+CloudFront) — cheapest, fastest. SPA fallback to `index.html` for client-side routing.
2. **Behind the same nginx as the API** — slightly simpler CORS (same-origin) at the cost of coupling deploys.
3. **Docker + nginx** — if you want to ship the frontend in the same compose file as the API.

### CSP / security headers
Backend already sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. Match your frontend host's defaults; for Vercel/Netlify, configure additional CSP headers there.

### CORS
Coordinate with backend before go-live: the production frontend origin must be in `appsettings.json:Cors:AllowedOrigins`. The empty-array fallback is dev-only; backend will reject unknown origins in production.

---

## 13. Recommended starter snippets

### TanStack Query setup
```ts
// src/main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (count, err: any) =>
        err?.status >= 500 && count < 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (err: any) => toast.error(err.message),
    },
  },
});
```

### Domain hook example
```ts
// src/hooks/useInvoices.ts
export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => api.get("/di", { params: filters })
                       .then((r) => r.data as PagedResult<InvoiceListItem>),
    placeholderData: keepPreviousData,
  });
}

export function usePostInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: PostInvoiceArgs) =>
      api.post<PostInvoiceResponse>("/di/postinvoicedata", body, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Invoice submitted — IRN ${res.data.fbrInvoiceNumber}`);
    },
  });
}
```

### Auth store
```ts
// src/stores/auth.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (s: AuthResponse) => void;
  refresh: () => Promise<boolean>;
  clear: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setSession: (s) => set({
    user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken
  }),
  refresh: async () => {
    const { accessToken, refreshToken } = get();
    if (!accessToken || !refreshToken) return false;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
        { accessToken, refreshToken }
      );
      get().setSession(res.data.data);
      return true;
    } catch { return false; }
  },
  clear: () => set({ user: null, accessToken: null, refreshToken: null }),
}));
```

---

## 14. Build order recommendation

Weeks 1–2 — get the core operator flow working end-to-end:
1. Project scaffold, axios + auth store, login page
2. App shell (sidebar + topbar) with role-aware nav
3. Dashboard (1 endpoint, easy win)
4. Invoice list page with filters + table
5. Invoice detail page (read-only) + PDF download
6. Invoice create form (the big one — start with reference-data dropdowns wired up)
7. Validate-before-submit pre-flight UX
8. Idempotent submit flow + success page

Week 3 — admin-y stuff:
9. User management + API keys
10. Branch management
11. Tenant settings (token entry, environment switch)
12. Scenario testing dashboard

Week 4 — polish:
13. Audit log viewer (with JSON diff)
14. Reports (compliance, failed invoices)
15. Products
16. Excel bulk upload (with whatever status the backend exposes by then)

> Test continually against the backend's Swagger UI at `/swagger`. The server's OpenAPI doc is authoritative — if this guide and Swagger disagree, Swagger wins.

---

## 15. Where to look for backend details

- **Business behaviour:** `Updated Functional Guide — Project Managers & Users.md`
- **Endpoint, DTO, role detail:** `Updated Technical Reference — Developers.md` (organized by feature)
- **What's still missing on the backend:** `Implementation Plan.md`
- **Live API surface:** `https://api.your-domain.com/swagger` (also localhost:5000 in dev)

---

*Frontend questions, ping the backend lead. Backend questions about the contracts, this document is the contract; the Swagger and the source are the tiebreakers.*
