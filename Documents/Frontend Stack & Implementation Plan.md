# ZarnTaxSync Frontend — Stack & Implementation Plan

## Context

This is a greenfield React SPA for ZarnTaxSync, a B2B FBR (Federal Board of Revenue) e-invoicing compliance platform. The backend is a .NET Core 10 API with PostgreSQL + Redis, ~90% complete. The frontend doesn't exist yet — no `package.json`, no `src/`, nothing except three planning documents in `Documents/`. This plan covers scaffolding the project from zero and building all 6 phases documented in `Documents/Frontend Implementation Plan.md`.

---

## Stack (Final)

| Concern | Library | Notes |
|---|---|---|
| Build tool | **Vite 5** | Fast HMR, SPA-first |
| Framework | **React 18 + TypeScript (strict)** | |
| Routing | **TanStack Router v1** | File-based, type-safe URL params |
| Server state | **TanStack Query v5** | Cache, dedupe, retry, replaces Redux |
| Tables | **TanStack Table v8** | Invoice list, audit logs, scenarios |
| Forms | **react-hook-form + Zod** | Mirrors .NET FluentValidation; all doc examples use this |
| HTTP | **axios** | JWT interceptors, error normalization, refresh replay |
| Local state | **zustand** | Auth store; no Redux |
| UI components | **shadcn/ui + Radix + Tailwind CSS** | Copy-paste, owned components, no runtime lock-in |
| Toasts | **sonner** | Lightweight |
| Charts | **recharts** | Dashboard bar chart |
| Dates | **date-fns** | Tree-shakeable; API uses ISO 8601 |
| Icons | **lucide-react** | Native shadcn/ui pair |
| Package manager | **pnpm** | Faster installs, disk efficient |

### Stack improvement suggestions (beyond what user listed)

- **`axios`** must be added — docs require it for JWT interceptor + refresh-replay pattern against the .NET API
- **`react-hook-form`** replaces "TanStack Form" per docs (user confirmed)
- **`sonner`** + **`recharts`** + **`date-fns`** + **`lucide-react`** are required per docs — add them
- **`@tanstack/router-devtools`** + **`@tanstack/react-query-devtools`** — add as dev deps for DX
- **`react-diff-viewer-continued`** — for audit log JSON diff in Phase 6
- Consider adding **`@tanstack/react-virtual`** if invoice lists become very long (> 1000 rows)
- For .NET Core integration: ensure `axios.defaults.withCredentials = true` for httpOnly cookie refresh tokens; coordinate CORS `AllowedOrigins` in `appsettings.json`

---

## Project Location

`F:\Frontend Fbr Invoicing\ZarnTaxSync-Frontend\` (current repo — already git-initialized)

> The docs say `D:\FLC\Cloudify Zone\FbrInvoicing\zarntaxsync-web\` but the actual repo is at the path above. We scaffold inside this repo.

---

## Phase 0 — Project Scaffold (Day 1)

**Goal:** Running dev server, all deps installed, folder skeleton in place.

### Steps

1. Init Vite project with pnpm:
   ```
   pnpm create vite@latest . -- --template react-ts
   ```
2. Install all dependencies in one command (see dependency list below)
3. `tsconfig.json` — strict mode + path alias `@/` → `src/`
4. `vite.config.ts` — TanStackRouterVite plugin, port 5173, manual chunks (`react`, `tanstack`)
5. `tailwind.config.ts` — shadcn-compatible preset
6. `pnpm dlx shadcn@latest init` — neutral theme, CSS variables
7. Add core shadcn components: `button card input label badge table dialog sheet skeleton select textarea`
8. Create `.env` + `.env.production`
9. Wire `QueryClientProvider` + `RouterProvider` in `src/main.tsx`
10. Create `src/lib/env.ts` — Zod-validated env vars (fail fast if `VITE_API_BASE_URL` is missing)

### Full dependency list

```
pnpm add react react-dom @tanstack/react-router @tanstack/react-query @tanstack/react-table react-hook-form @hookform/resolvers zod axios zustand recharts sonner date-fns lucide-react class-variance-authority clsx tailwind-merge

pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss postcss autoprefixer @tanstack/router-plugin @tanstack/react-query-devtools @tanstack/router-devtools react-diff-viewer-continued
```

### Key files created
- `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `components.json`
- `src/main.tsx` — QueryClient: staleTime 30s, retry 5xx only, refetchOnWindowFocus false
- `src/lib/env.ts` — validated env
- `src/routes/__root.tsx`
- `.env`, `.env.production`

**Verification:** `pnpm dev` → blank page at `localhost:5173`, no console errors.

---

## Phase 1 — Auth Layer + App Shell (Days 2–3)

**Goal:** Login → protected layout → role-aware sidebar.

### Files to create

| File | Purpose |
|---|---|
| `src/api/types.ts` | `ApiResponse<T>`, `PaginationMeta`, `PagedResult<T>`, all shared DTO types |
| `src/api/client.ts` | axios instance: attach Bearer token, unwrap `ApiResponse`, 401 refresh-replay, `normalizeError()` |
| `src/stores/auth.ts` | zustand: `user`, `accessToken`, `setSession()`, `refresh()`, `clear()` |
| `src/api/auth.ts` | `login`, `refreshToken`, `revokeToken`, `changePassword` |
| `src/routes/login.tsx` | react-hook-form + zod; 429 countdown toast; redirect to `/dashboard` on success |
| `src/routes/_auth.tsx` | Layout route: no token → redirect `/login`; renders Sidebar + TopBar + Outlet |
| `src/components/layout/Sidebar.tsx` | Nav filtered by `user.role` |
| `src/components/layout/TopBar.tsx` | Breadcrumb, sandbox banner, avatar dropdown |
| `src/components/common/RequireRole.tsx` | `<RequireRole min="Operator">` — hides children + tooltip if below |
| `src/components/common/DataTable.tsx` | Generic TanStack Table wrapper (server-side pagination) |

### HTTP → toast mapping (wired in `client.ts`)

| Status | Behaviour |
|---|---|
| 400 / 422 | Return `errors[]` to caller — form shows inline |
| 401 | Auto-refresh → replay; on failure → `/login` |
| 403 | Toast "You don't have permission" |
| 409 | Toast "Record was just modified — refresh and try again" |
| 429 | Toast with retry-after countdown |
| 502 | Toast "FBR unreachable — save as draft or retry" |
| 503 | Toast "FBR temporarily unavailable. Wait 30 seconds" |
| 5xx | Toast with `correlationId` |

### Token storage strategy (for .NET Core)

- **Access token:** zustand memory only (never localStorage — XSS risk)
- **Refresh token:** httpOnly cookie via `axios.defaults.withCredentials = true`
- **Dev fallback:** localStorage until backend sets `Set-Cookie` header

**Verification:** Login → dashboard redirect; logout → `/login`; 401 replay with refresh token works.

---

## Phase 2 — Tenant Onboarding (Days 4–7)

**Goal:** SuperAdmin can create tenants, upload FBR PRAL tokens, switch environment.

### Files to create

| File | Purpose |
|---|---|
| `src/api/tenants.ts` | All tenant CRUD + token + environment + settings endpoints |
| `src/hooks/useTenants.ts` | TanStack Query wrappers |
| `src/routes/_auth.tenants.index.tsx` | TanStack Table (server-side); URL-persisted filters |
| `src/routes/_auth.tenants.new.tsx` | Create form |
| `src/routes/_auth.tenants.$id.tsx` | Detail: 4 tabs (Overview, Settings, FBR Token, Users) |
| `src/components/tenant/TokenStatusCard.tsx` | Expiry badge: green >60d, amber 30–60d, red <30d |
| `src/components/tenant/FbrTokenForm.tsx` | Token textarea + expiry date picker |

### Key UX details

- **Overview tab:** `businessActivity` select + `sector` select (required for Phase 3 scenario filtering) — depends on backend N4
- **FBR Token tab:** sandbox + production token upload; environment radio (Sandbox/Production); no test-fire button (backend gap H3)
- **Settings tab:** key-value inline edit; encrypted fields show lock icon; webhook URL row saves to `Webhook:Url` key

**Verification:** SuperAdmin creates tenant → uploads sandbox token → sees expiry badge → switches environment.

---

## Phase 3 — Scenario Testing (Days 8–9)

**Goal:** 28 PRAL sandbox scenarios filtered by tenant business activity, runnable and certifiable.

### Files to create

| File | Purpose |
|---|---|
| `src/api/scenarios.ts` | `listScenarios`, `runScenario`, `certifyScenario`, `getScenarioSummary` |
| `src/lib/scenarioMatrix.ts` | Static `{ businessActivity, sector } → scenarioId[]` map per FBR DI API V1.12 §10 |
| `src/routes/_auth.scenarios.tsx` | Summary card + TanStack Table filtered by business activity |
| `src/components/scenarios/ScenarioStatusBadge.tsx` | Status badge component |

### Key logic

- Filter displayed scenarios via `scenarioMatrix.ts` — non-applicable rows hidden
- Empty state CTA if `tenant.businessActivity` is null: "Set Business Activity on the Tenant Overview tab"
- Persistent warning banner: "Scenario payloads are placeholders — FBR will reject until backend B1 ships"

**Verification:** Manufacturer + All Other Sectors → 11 rows; Retailer + All Other Sectors → 16 rows.

---

## Phase 4 — Core Operator Flow (Days 10–15)

### Files to create

| File | Purpose |
|---|---|
| `src/api/invoices.ts` | All invoice endpoints (list, get, IRN lookup, logs, PDF, cancel, validate, post, upload) |
| `src/api/reports.ts` | `getDashboard`, `getTokenStatus`, `getComplianceReport`, `getFailedInvoices` |
| `src/hooks/useInvoices.ts` | TanStack Query wrappers + `usePostInvoice` mutation with idempotency key |
| `src/hooks/useReference.ts` | Reference data hooks with cache strategies (provinces 24h, HS codes 1h, etc.) |
| `src/hooks/useDashboard.ts` | Dashboard data hook |
| `src/routes/_auth.dashboard.tsx` | 4 KPI cards + recharts BarChart `last7Days` |
| `src/routes/_auth.invoices.index.tsx` | TanStack Table + URL-persisted filters (status, type, dates, search, page) |
| `src/routes/_auth.invoices.$id.tsx` | Detail: IRN prominent, buyer/seller, line items, submission logs, PDF, cancel |
| `src/routes/_auth.invoices.new.tsx` | Create form (see below) |
| `src/routes/_auth.invoices.upload.tsx` | Drag-drop Excel upload + autoSubmit toggle |
| `src/components/invoice/InvoiceForm.tsx` | Full create form (react-hook-form + zod + useFieldArray) |
| `src/components/invoice/InvoiceItemsTable.tsx` | Dynamic line items with HS/UoM/rate dropdowns + SRO fields |
| `src/components/invoice/InvoiceStatusBadge.tsx` | Status badges with colors |
| `src/components/invoice/SubmissionLogsAccordion.tsx` | Collapsible FBR request/response JSON |
| `src/components/invoice/BuyerNtnLookup.tsx` | Debounced 400ms dual FBR check (registration-type + STATL) |
| `src/lib/format.ts` | `formatPKR()`, `formatNtnCnic()`, `formatDate()` |

### Invoice create form — critical details

**Zod schema highlights (mirror .NET FluentValidation):**
```ts
sellerNtnCnic: z.string().refine(v => [7, 9, 13].includes(v.replace(/[-\s]/g, "").length))
invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => isWithinLast30Days(v))
invoiceRefNo: z.string().refine(v => !v || v.length === 22 || v.length === 28).optional()
```

**Idempotency key:** `crypto.randomUUID()` on mount, persisted in form state, sent as `Idempotency-Key` header.

**Backend gaps to handle:**
- **B2** (Debit Note Reason/Remarks): Render inputs now with yellow warning "FBR will reject until backend B2 ships"
- **H4** (Doc/Trans Type): Hardcode `transTypeId` in rate calls until backend H4 ships

**Submit flow:** client Zod → optional pre-flight `POST /di/validateinvoicedata` → `POST /di/postinvoicedata` → navigate to `/invoices/{id}` + IRN toast.

**Per-item rejection UX:** red dot on affected row + tooltip with `fbrItemErrorCode + fbrItemError`.

**⚠️ Critical type fixes (from API_ENDPOINTS.md v2.0 analysis):**
- `invoiceType` must be `"SaleInvoice"` / `"DebitNote"` (no spaces) — NOT `"Sale Invoice"` as the Frontend Guide says
- `scenarioId` is an `integer` — NOT a string like `"SN001"`
- `rate` per item is a `number` (e.g. `18`) — NOT `"18%"` string; format as percentage for display only
- `PaginationMeta` field is `pageNumber` — NOT `page`

**PDF download:** Use authenticated Blob fetch (NOT `window.open()`) — endpoint requires Bearer token:
```ts
const res = await api.get(`/di/${id}/pdf`, { responseType: "blob" });
const url = URL.createObjectURL(res.data);
const a = document.createElement("a"); a.href = url; a.download = `invoice-${id}.pdf`; a.click();
URL.revokeObjectURL(url);
```

**Verification:** Create → pre-flight → submit → IRN toast → PDF downloads (Blob) → cancel works → Excel upload returns 202.

---

## Phase 5 — Admin Management + Integration (Days 16–18)

### Files to create

| File | Purpose |
|---|---|
| `src/api/users.ts` | User CRUD + role change + activate/deactivate/unlock + API keys |
| `src/api/branches.ts` | Branch CRUD + `GET /branches/{id}` + activate/deactivate |
| `src/api/integration.ts` | `pushIntegrationInvoice(body, externalRefId?)` — `POST /integration/invoices` |
| `src/routes/_auth.users.index.tsx` | Paginated table with branch filter; show lockout countdown from `lockoutEnd` field |
| `src/routes/_auth.users.$id.tsx` | Detail: edit, role change, API keys sub-section |
| `src/routes/_auth.branches.index.tsx` | Table; head-office deactivate **disabled** (not hidden) + tooltip |
| `src/routes/_auth.integration.tsx` | Integration settings page: guide tab, test-push tab, API keys link |
| `src/components/users/ApiKeyOneTimeModal.tsx` | Shows `rawKey` one-time with copy button + "I've saved this key" checkbox required before dismiss |

### Integration page (`/integration`)
- **Guide tab:** `X-Api-Key` + `X-External-Reference-Id` usage docs; copyable cURL snippet for `POST /integration/invoices`
- **Test push tab:** simplified form to manually fire a test invoice through integration endpoint
- **User lockout UX:** when `isLockedOut = true`, show countdown timer derived from `lockoutEnd - Date.now()`

**Verification:** Create user → API key one-time modal copy; head-office deactivate disabled; integration guide page loads; lockout countdown visible.

---

## Phase 6 — Polish & Secondary Features (Days 19–21)

### Files to create

| File | Purpose |
|---|---|
| `src/api/auditLogs.ts` | Audit log list + entity deep-link |
| `src/api/products.ts` | Product CRUD + CSV import |
| `src/routes/_auth.audit-logs.tsx` | Table + date/entityType filters + JSON diff columns |
| `src/routes/_auth.reports.tsx` | Compliance card (PKR penalty) + failed invoices tab |
| `src/routes/_auth.products.tsx` | Inline CRUD + CSV import |
| `src/routes/_auth.profile.change-password.tsx` | Change password → revoke token → redirect `/login` |

### Cross-cutting UX polish

- **Sandbox banner:** persistent yellow bar when `environment === "Sandbox"` from token-status
- **Compliance onboarding modal:** one-time `localStorage` flag `zts_onboarding_seen`; shown to TenantAdmin on first login
- **Loading skeletons:** `shadcn/ui Skeleton` on every data-fetching page
- **Empty states:** actionable CTAs on all tables

---

## Target File Tree

```
ZarnTaxSync-Frontend/
├── src/
│   ├── main.tsx
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── _auth.tsx
│   │   ├── _auth.dashboard.tsx
│   │   ├── _auth.invoices.index.tsx
│   │   ├── _auth.invoices.new.tsx
│   │   ├── _auth.invoices.$id.tsx
│   │   ├── _auth.invoices.upload.tsx
│   │   ├── _auth.scenarios.tsx
│   │   ├── _auth.tenants.index.tsx
│   │   ├── _auth.tenants.new.tsx
│   │   ├── _auth.tenants.$id.tsx
│   │   ├── _auth.branches.index.tsx
│   │   ├── _auth.users.index.tsx
│   │   ├── _auth.users.$id.tsx
│   │   ├── _auth.integration.tsx
│   │   ├── _auth.audit-logs.tsx
│   │   ├── _auth.reports.tsx
│   │   ├── _auth.products.tsx
│   │   ├── _auth.profile.change-password.tsx
│   │   └── login.tsx
│   ├── api/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── auth.ts
│   │   ├── invoices.ts
│   │   ├── tenants.ts
│   │   ├── branches.ts
│   │   ├── users.ts
│   │   ├── reference.ts
│   │   ├── reports.ts
│   │   ├── scenarios.ts
│   │   ├── auditLogs.ts
│   │   ├── products.ts
│   │   └── integration.ts
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useReference.ts
│   │   ├── useDashboard.ts
│   │   ├── useTenants.ts
│   │   └── useScenarios.ts
│   ├── components/
│   │   ├── ui/                           (shadcn generated)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── common/
│   │   │   ├── RequireRole.tsx
│   │   │   └── DataTable.tsx
│   │   ├── invoice/
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── InvoiceItemsTable.tsx
│   │   │   ├── InvoiceStatusBadge.tsx
│   │   │   ├── SubmissionLogsAccordion.tsx
│   │   │   └── BuyerNtnLookup.tsx
│   │   ├── tenant/
│   │   │   ├── TokenStatusCard.tsx
│   │   │   └── FbrTokenForm.tsx
│   │   ├── users/
│   │   │   └── ApiKeyOneTimeModal.tsx
│   │   └── scenarios/
│   │       └── ScenarioStatusBadge.tsx
│   ├── stores/
│   │   └── auth.ts
│   └── lib/
│       ├── format.ts
│       ├── env.ts
│       └── scenarioMatrix.ts
├── .env
├── .env.production
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## .NET Core Integration Notes

1. **CORS:** Backend `appsettings.json` must include `http://localhost:5173` (dev) and `https://app.your-domain.com` (prod) in `Cors:AllowedOrigins`
2. **Refresh token as httpOnly cookie:** Requires backend to set `Set-Cookie` on `/auth/refresh-token` response + `axios.defaults.withCredentials = true` on frontend
3. **Response envelope:** All responses wrap in `ApiResponse<T>` — axios interceptor unwraps `.data.data` so callers receive the payload directly
4. **Error format:** Server returns `errors[]` as `"Field: message"` from FluentValidation — `normalizeError()` in `client.ts` extracts these for inline form display
5. **Swagger:** Use `https://localhost:5000/swagger` during development — Swagger is the tiebreaker if this doc and the API diverge

---

## Build Sequence Summary

| Phase | Days | Deliverable | Backend dependency |
|---|---|---|---|
| 0 — Scaffold | 1 | Dev server running | — |
| 1 — Auth + Shell | 2–3 | Login, protected layout, role sidebar | — |
| 2 — Tenant Onboarding | 4–7 | Create tenant, FBR token, env switch | Backend N4 (BusinessType field) |
| 3 — Scenarios | 8–9 | 28 scenarios filtered by business activity | N4 + B1 |
| 4 — Operator Flow | 10–15 | Dashboard, invoice CRUD, Excel upload | B2 (Debit Note Reason fields) |
| 5 — Admin + Integration | 16–18 | Users, branches, API keys, integration page | — |
| 6 — Polish | 19–21 | Audit logs, reports, products, change-password | — |

**Phases 0, 1, 5, 6 can start immediately — no backend blockers.**
