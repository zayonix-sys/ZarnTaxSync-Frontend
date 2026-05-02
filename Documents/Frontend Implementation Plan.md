# ZarnTaxSync — Frontend Implementation Plan

**Audience:** Frontend developer
**Backend:** Fully complete — .NET 10 Web API · PostgreSQL · Redis
**Document version:** 1.1 — 26 April 2026 (FBR DI API V1.12 gap closure: scenario filtering by business activity, Debit Note Reason/Remarks fields, SRO Schedule/Item Serial line-item inputs, per-item rejection UX, Doc/Trans Type cache entries, Credit Note scope note)

> This document is the execution plan for building the ZarnTaxSync React SPA from scratch. Read alongside **Frontend Implementation Guide.md** (API contracts + code snippets) and **Updated Technical Reference — Developers.md** (endpoint/DTO detail).

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Project location | `D:\FLC\Cloudify Zone\FbrInvoicing\zarntaxsync-web\` | Separate folder from backend repo |
| Refresh token storage | httpOnly cookie (standard practice) | Access token in memory (zustand), refresh token in httpOnly cookie. Requires backend `Set-Cookie` + CORS `credentials:true`. **Dev fallback**: localStorage until backend cookie config is done. |
| Branding | shadcn/ui default neutral palette | No custom colors; clean B2B admin look |
| Phase order | Tenant onboarding → Scenarios → Operator flow → Admin → Polish | Unblocks PRAL sandbox certification before operators begin |

---

## Stack

```
Vite 5 + React 18 + TypeScript (strict)
TanStack Router v1        — file-based, type-safe routing
TanStack Query v5         — server state, cache, dedupe, retry
TanStack Table v8         — heavy data grids (invoices, audit logs, scenarios)
react-hook-form + zod     — forms + client-side validation mirroring FluentValidation
axios                     — HTTP client + request/response interceptors
zustand                   — auth store + UI state (no Redux)
shadcn/ui + Radix + Tailwind CSS  — owned component library
recharts                  — dashboard charts
sonner                    — toast notifications
date-fns                  — date formatting (API uses ISO 8601 throughout)
lucide-react              — icons
```

---

## Phase 0 — Project Scaffold (Day 1)

**Goal:** Running dev server, all dependencies installed, folder structure matching Frontend Implementation Guide §2.

### Steps

1. `npm create vite@latest zarntaxsync-web -- --template react-ts` at `D:\FLC\Cloudify Zone\FbrInvoicing\`
2. Install all dependencies in one `npm install` command
3. Configure `tsconfig.json` — strict mode + path alias `@/` → `src/`
4. `vite.config.ts` — TanStackRouterVite plugin, port 5173, manual chunks (react, tanstack)
5. `tailwind.config.ts` — shadcn-compatible preset
6. `npx shadcn@latest init` — neutral theme, CSS variables
7. Add core shadcn components: `button card input label badge table dialog sheet skeleton`
8. Create `.env` (`VITE_API_BASE_URL=http://localhost:5000/api/v1`) and `.env.production`
9. Wire `QueryClientProvider` + `RouterProvider` in `src/main.tsx`

### Key files created
- `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- `src/main.tsx` — QueryClient: staleTime 30s, retry on 5xx only, refetchOnWindowFocus false
- `src/lib/env.ts` — Zod-validated env vars (fail fast on missing `VITE_API_BASE_URL`)
- `src/routes/__root.tsx` — root route

### Verification
`npm run dev` → blank page at `localhost:5173`, no console errors.

---

## Phase 1 — Auth Layer + App Shell (Days 2–3)

**Goal:** Login → protected layout → role-aware sidebar. All subsequent phases gate on this.

### Steps

1. **`src/api/types.ts`** — `ApiResponse<T>`, `PaginationMeta`, `PagedResult<T>`, all shared TS types mirroring backend DTOs (`UserProfileResponse`, `AuthResponse`, etc.)
2. **`src/api/client.ts`** — axios instance wired with:
   - Request interceptor: attach `Authorization: Bearer <token>` from zustand store
   - Response interceptor: unwrap `ApiResponse<T>` (callers receive `.data` directly); on 401 call `refresh()` once then replay; on 429 surface countdown toast; `normalizeError()` extracts `errors[]`, `message`, `correlationId`
3. **`src/stores/auth.ts`** — zustand: `user`, `accessToken`, `setSession(AuthResponse)`, `refresh()`, `clear()`
   - Access token: in-memory only (never persisted)
   - Refresh token: httpOnly cookie via `axios.defaults.withCredentials = true`; dev fallback: localStorage
4. **`src/api/auth.ts`** — `login`, `refreshToken`, `revokeToken`, `changePassword`
5. **`src/routes/login.tsx`** — react-hook-form + zod; 429 countdown toast; on success navigate to `/dashboard` (or saved redirect)
6. **`src/routes/_auth.tsx`** — layout route: no `accessToken` → redirect `/login`; renders `<Sidebar>` + `<TopBar>` + `<Outlet>`
7. **`src/components/layout/Sidebar.tsx`** — nav links filtered by `user.role`; hides Tenants for non-SuperAdmin, UserMgmt for below TenantAdmin, etc.
8. **`src/components/layout/TopBar.tsx`** — breadcrumb, sandbox environment banner, user avatar dropdown (Change Password, Logout)
9. **`src/components/common/RequireRole.tsx`** — `<RequireRole min="Operator">` — hides children and shows tooltip if user is below minimum role

### HTTP → toast mapping (wired in `client.ts`)

| Status | Behaviour |
|---|---|
| 400 / 422 | Return `errors[]` to caller — form displays inline |
| 403 | Toast "You don't have permission" |
| 409 | Toast "Record was just modified — refresh and try again" |
| 502 | Toast "FBR is unreachable — save as draft or retry" |
| 503 | Toast "FBR temporarily unavailable. Wait 30 seconds" |
| 5xx | Toast with `correlationId` so user can quote it to support |

### Key files
- `src/stores/auth.ts`
- `src/api/client.ts`, `src/api/types.ts`, `src/api/auth.ts`
- `src/routes/login.tsx`, `src/routes/_auth.tsx`
- `src/components/layout/Sidebar.tsx`, `TopBar.tsx`
- `src/components/common/RequireRole.tsx`

### Verification
Login → dashboard redirect; logout clears store → `/login`; 401 replay with refresh token works.

---

## Phase 2 — SuperAdmin: Tenant Onboarding Flow (Days 4–7) ← Priority

**Goal:** SuperAdmin can create a tenant, upload FBR PRAL tokens, and switch environment. This unblocks sandbox certification.

### 2.1 Tenants list (`/tenants`) — SuperAdmin only

- **`src/api/tenants.ts`** — `listTenants`, `getTenant`, `createTenant`, `updateTenant`, `deactivateTenant`, `activateTenant`, `getTenantSettings`, `upsertTenantSetting`, `updateSandboxToken`, `updateProductionToken`, `setEnvironment`, `getTokenStatus`
- **`src/hooks/useTenants.ts`** — TanStack Query wrappers for all above
- **`src/routes/_auth.tenants.index.tsx`** — TanStack Table (server-side); columns: Name, NTN/CNIC, Plan, Status badge, Branch count, Created; search + pagination persisted in URL params
- **`src/routes/_auth.tenants.new.tsx`** — create form: name, subdomain, ntnCnic, planType
- **`src/routes/_auth.tenants.$id.tsx`** — detail page with four tabs

### 2.2 Tenant detail — four tabs

**Overview tab**
- Editable fields: name, NTN/CNIC, plan type, **business activity**, **sector**
- **Business activity** select (Manufacturer / Importer / Distributor / Wholesaler / Exporter / Retailer / ServiceProvider / Other) — drives scenario filtering in Phase 3 (FBR DI API V1.12 §10). Depends on backend N4 (`Tenant.BusinessType` field).
- **Sector** select (All Other Sectors / Steel / FMCG / Textile / Telecom / Petroleum / Electricity Distribution / Gas Distribution / Services / Automobile / CNG Stations / Pharmaceuticals / Wholesale-Retails) — combined with business activity to look up the scenario subset per FBR §10. Depends on backend N4.
- Activate / Deactivate buttons with confirmation

**Settings tab**
- `GET /tenants/{id}/settings` → key-value table with inline edit; save calls `PUT /tenants/{id}/settings`
- Show `isEncrypted` lock icon; mask value display for encrypted keys
- **Webhook URL row**: dedicated labelled input "Webhook Notification URL" — reads/writes the `Webhook:Url` key; no test-fire button (backend gap H3)

**FBR Token tab** ← Most critical for onboarding
- Token status card (`GET /tenants/{id}/token-status`): "Active env: Sandbox · Expires in 47 days" — green >60 days, amber 30–60, red <30
- Sandbox token form: token `<textarea>` + expiry date picker → `PUT /tenants/{id}/token/sandbox`
- Production token form: same shape → `PUT /tenants/{id}/token/production`
- Environment toggle (radio: Sandbox / Production) → `PUT /tenants/{id}/environment`
- No "test token" button (backend gap — no test endpoint exists)

**Users tab**
- Read-only list of users belonging to this tenant (links to `/users/{id}`)

### Key files
- `src/api/tenants.ts`, `src/hooks/useTenants.ts`
- `src/routes/_auth.tenants.index.tsx`, `_auth.tenants.new.tsx`, `_auth.tenants.$id.tsx`
- `src/components/tenant/TokenStatusCard.tsx`
- `src/components/tenant/FbrTokenForm.tsx`

### Verification
SuperAdmin: create tenant → upload sandbox token → see expiry badge → switch environment to Sandbox.

---

## Phase 3 — Scenario Testing Dashboard (Days 8–9)

**Goal:** 28 PRAL sandbox scenarios visible, runnable, and certifiable.

### Steps

- **`src/api/scenarios.ts`** — `listScenarios`, `runScenario`, `certifyScenario`, `getScenarioSummary`
- **`src/lib/scenarioMatrix.ts`** — static map of `{ businessActivity, sector } → number[]` mirroring FBR DI API V1.12 §10 "Applicable Scenarios based on Business Activity". Source of truth for which of the 28 are applicable per tenant.
- **`src/routes/_auth.scenarios.tsx`**
  - Summary card: `GET /di/scenarios/summary` → progress bar + Pending / Passed / Failed counts (counts are scoped to the applicable subset, not all 28)
  - TanStack Table: Scenario#, Name, Status badge, Last Run, Certified At, Run / Certify actions
  - **Filtered by current tenant's `businessActivity` + `sector`** via `scenarioMatrix.ts` — non-applicable scenarios are hidden (e.g. SN026/SN027/SN028 only show for Retailers; SN003/SN004/SN011 only show for Steel sector). If tenant has no business activity set yet, render an empty-state CTA: "Set Business Activity on the Tenant Overview tab to see applicable scenarios."
  - "Run" → `POST /di/scenarios/{id}/run` + spinner; refetch list on settle (`BranchManager+`)
  - "Certify" → `PUT /di/scenarios/{id}/certify`; only enabled when status = Passed (`TenantAdmin+`)
- **Warning banner** (persistent, non-dismissible): "Scenario payloads are currently placeholders — FBR will reject most runs until backend B1 is delivered."

### Key files
- `src/api/scenarios.ts`
- `src/routes/_auth.scenarios.tsx`
- `src/components/scenarios/ScenarioStatusBadge.tsx`
- `src/lib/scenarioMatrix.ts`

### Verification
Applicable scenarios load (e.g. Manufacturer + All Other Sectors → 11 rows; Retailer + All Other Sectors → 16 rows including SN026–028); Run shows spinner then updates status; Certify only enables on Passed rows; empty state shown if `tenant.businessActivity` is null.

---

## Phase 4 — Core Operator Flow (Days 10–15)

### 4.1 Dashboard (`/dashboard`)

- **`src/api/reports.ts`** — `getDashboard`, `getComplianceReport`, `getFailedInvoices`, `getTokenStatus`
- **`src/routes/_auth.dashboard.tsx`**
  - 4 KPI cards: Submitted Today, Failed Today, Pending Today, Deferred Today (will read 0 until backend deferred queue is built)
  - Recharts `<BarChart>` of `last7Days` (submitted vs failed trend)
  - Token status badge in TopBar reads `GET /reports/token-status`

### 4.2 Invoice list (`/invoices`)

- **`src/api/invoices.ts`** — `listInvoices`, `getInvoice`, `getByIrn`, `getSubmissionLogs`, `getPdfUrl`, `cancelInvoice`, `validateInvoice`, `postInvoice`, `uploadExcel`
- **`src/routes/_auth.invoices.index.tsx`**
  - TanStack Table (server-side pagination): columns — IRN, Type, Date, Seller, Buyer, Status badge, Total Tax, Actions
  - All filters in URL search params: `status`, `invoiceType`, `fromDate`, `toDate`, `search`, `page`, `pageSize`
  - Status badges: Draft = gray · Pending = amber + pulse · Submitted = green (IRN in tooltip) · Failed = red (error tooltip, click → submission logs) · Cancelled = strikethrough neutral
  - "New Invoice" (Operator+), "Upload Excel" (Operator+) buttons

### 4.3 Invoice detail (`/invoices/$id`)

- **`src/routes/_auth.invoices.$id.tsx`**
  - IRN displayed prominently when status = Submitted (legally required artifact)
  - Buyer/seller header + line items table (read-only)
  - Submission logs accordion: `GET /di/{id}/submission-logs` → collapsible rows with syntax-highlighted FBR request/response JSON
  - "Download PDF" → `window.open(GET /di/{id}/pdf)` — opens `application/pdf` in new tab
  - "Cancel" — visible if Draft or Failed; `BranchManager+`; confirmation dialog
  - "Retry" — **hidden** (backend gap H1 — endpoint not built)
  - "Look up by IRN" search bar → `GET /di/by-irn/{irn}`

### 4.4 Invoice create form (`/invoices/new`) — The big one

**Form structure (react-hook-form + zod, `useFieldArray` for line items):**

**Section 1 — Invoice header**
- `invoiceType` select — options driven by backend `InvoiceType` enum: today **Sale Invoice / Debit Note**. *(Credit Note is referenced in some FBR error codes and the Frontend Implementation Guide, but is not implemented in the backend `InvoiceType` enum. Add a third "Credit Note" option only when backend adds `CreditNote = 3`.)*
- `invoiceDate` date picker — client-side enforces last 30 days (mirrors `FBR_DATE_001`)
- `saleType` select
- `scenarioId` — visible only when tenant environment = Sandbox; **options filtered to scenarios applicable to tenant's business activity** (`src/lib/scenarioMatrix.ts`)
- If Debit Note: `invoiceRefNo` input — zod validates digits-only and length 22 (NTN seller, 7-digit) or 28 (CNIC seller, 13-digit) per `FBR_REF_002` + `FBR_REF_003` (backend B4)
- If Debit Note: **`debitNoteReason` select + `debitNoteReasonRemarks` textarea** (FBR errors 0030 / 0031). Reason options: Sales Return / Quantity Adjustment / Price Adjustment / Goods Returned / Tax Rate Change / Others. Remarks is required and `min(10)` when reason = "Others". *Depends on backend B2 — if the field doesn't exist on `PostInvoiceRequest` yet, render the inputs but show a yellow inline warning: "Backend B2 pending — submission will fail at FBR until shipped."*

**Section 2 — Seller info** (pre-filled from `useAuth().user` tenant data)
- `sellerNtnCnic`, `sellerBusinessName`, `sellerProvince` (dropdown from `GET /reference/provinces`, 24h cache), `sellerAddress`

**Section 3 — Buyer info**
- `buyerRegistrationType` radio (Registered / Unregistered)
- If Registered: NTN/CNIC input field
  - On blur (debounced 400ms), fire **two parallel live FBR checks** (no cache):
    1. `GET /reference/registration-type?registrationNo=<value>` — show inline badge "Registered ✓" or "Unregistered"; auto-correct radio if server disagrees
    2. `GET /reference/statl?regNo=<value>&date=<invoiceDate>` — show inline warning "⚠ Not in SATL active taxpayer list" if `isActive === false`
  - Spinner in input field while both calls are pending
- `buyerBusinessName`, `buyerProvince`, `buyerAddress`

**Section 4 — Line items** (`useFieldArray`)
- Add / remove rows dynamically
- Per row: `hsCode` combobox (`GET /reference/hs-codes?search=`, 1h cache per term) · `productDescription` · `quantity` · `uoM` (auto-populated from `GET /reference/uom?hsCode=` on HS change, 1h cache) · `rate` (from `GET /reference/rates`) · all tax fields (`salesTaxApplicable`, `salesTaxWithheldAtSource`, `extraTax`, `furtherTax`, `fedPayable`, `discount`)
- **`sroScheduleNo` combobox** — conditional, shown when row's sale type implies an SRO. Loads from `GET /reference/sro-schedule?rateId={row.rateId}&date={invoiceDate}` (1h cache). Optional per FBR field spec (§4.1).
- **`sroItemSerialNo` combobox** — conditional, shown when `sroScheduleNo` is set. Cascades on the chosen schedule + invoice date: `GET /reference/sro-items?date={invoiceDate}&sroId={sroScheduleNo}` (1h cache). Optional per FBR field spec.
- Footer totals (`totalQuantity`, `totalSalesTax`, `totalBillAmount`) auto-calculated from rows; "Recalculate from items" button re-sums on demand
- Product master combobox (`GET /products`) to pre-fill `hsCode` + `saleType` per row
- **Per-row error indicator**: after a partial-failure submit (`PostInvoiceResponse.itemStatuses[].statusCode === "01"`), show a red dot on the affected row with a tooltip containing `fbrItemErrorCode + fbrItemError`. Click → expand row to show full FBR rejection text. (Mirrors FBR `invoiceStatuses[]` per-item rejection — header may be `00` while individual items are `01`.)

**Idempotency key**: `crypto.randomUUID()` on form mount, persisted in form state, sent as `Idempotency-Key` header on submit — safe double-click / page-reload re-submit.

**Pre-flight validate button**: `POST /di/validateinvoicedata` with the same body — surfaces item errors, `COMPLIANCE_FAILED`, `FINANCIAL_INTEGRITY_FAILED` in a Results section **without issuing an IRN**.

**Submit flow**:
1. Client zod validation
2. Optional pre-flight validate (shows results non-blocking)
3. `POST /di/postinvoicedata` + `Idempotency-Key` header
4. On success: navigate to `/invoices/{localInvoiceId}` + IRN toast
5. Error surfaces: field-level (`errors[]`), compliance section (`COMPLIANCE_FAILED`), financial integrity section (`FINANCIAL_INTEGRITY_FAILED`), per-item FBR rejection rows

### 4.5 Excel bulk upload (`/invoices/upload`)

- Drag-drop / file picker `.xlsx`
- `autoSubmit` toggle checkbox
- `POST /di/upload-excel` multipart → 202 → show `jobId` + `totalRows` received
- No status polling endpoint (backend gap H2) — show "Upload queued. Track progress in the invoice list" + link to `/invoices?status=Pending`

### Key files
- `src/api/invoices.ts`, `src/api/reports.ts`
- `src/hooks/useInvoices.ts`, `useReference.ts`, `useDashboard.ts`
- `src/routes/_auth.dashboard.tsx`
- `src/routes/_auth.invoices.index.tsx`, `_auth.invoices.$id.tsx`, `_auth.invoices.new.tsx`, `_auth.invoices.upload.tsx`
- `src/components/invoice/InvoiceForm.tsx`
- `src/components/invoice/InvoiceItemsTable.tsx`
- `src/components/invoice/InvoiceStatusBadge.tsx`
- `src/components/invoice/SubmissionLogsAccordion.tsx`
- `src/components/invoice/BuyerNtnLookup.tsx` — debounced dual check (registration-type + STATL) with spinner + inline badges
- `src/lib/format.ts` — `formatPKR()`, `formatNtnCnic()`, `formatDate()`

### Verification
Create invoice → pre-flight validate → submit → IRN toast → detail page shows IRN prominently → PDF opens → cancel flow works → Excel upload returns 202.

---

## Phase 5 — Admin Management (Days 16–18)

### 5.1 Users (`/users`) — TenantAdmin+

- **`src/api/users.ts`** — all user + API key endpoints
- **`src/routes/_auth.users.index.tsx`** — paginated table; filter by branch
- **`src/routes/_auth.users.$id.tsx`** — detail: edit name/branch, change role, activate/deactivate/unlock buttons

**API Keys sub-section** (on user detail page)
- List: name, key prefix, expiry, last used, status
- Create: name + optional expiry → `POST /users/{id}/api-keys` → response includes `rawKey` **one time only** → show `<Dialog>` with copy-to-clipboard button + "I've copied and saved this key" checkbox required before dismiss
- Revoke: `POST /users/{id}/api-keys/{keyId}/revoke` with confirmation dialog

### 5.2 Branches (`/branches`) — TenantAdmin+

- **`src/api/branches.ts`**
- **`src/routes/_auth.branches.index.tsx`** — paginated table; create / edit inline sheet
- Activate / deactivate buttons; head-office row: deactivate button disabled + tooltip "Head office branch cannot be deactivated"

### Key files
- `src/api/users.ts`, `src/api/branches.ts`
- `src/routes/_auth.users.index.tsx`, `_auth.users.$id.tsx`
- `src/routes/_auth.branches.index.tsx`
- `src/components/users/ApiKeyOneTimeModal.tsx`

### Verification
Create user → API key one-time modal copy; branch deactivate disabled for head-office row.

---

## Phase 6 — Polish & Secondary Features (Days 19–21)

### 6.1 Audit logs (`/audit-logs`) — BranchManager+

- **`src/api/auditLogs.ts`**
- **`src/routes/_auth.audit-logs.tsx`** — TanStack Table with date range + `entityType` + `entityId` filters in URL params
- `oldValues` / `newValues` columns: collapsible side-by-side JSON diff (two-column `<pre>` or `react-diff-viewer-continued`)
- "History" deep-link from any entity record → `GET /audit-logs/entity/{entityType}/{entityId}`

### 6.2 Reports (`/reports`)

- **`src/routes/_auth.reports.tsx`**
  - Compliance card: annual turnover input → `GET /reports/compliance?annualTurnover=` → Rule 150Q badge (compliant / non-compliant), SRO risk flag, penalty risk estimate in PKR (`Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' })`)
  - Failed invoices tab: `GET /reports/failed-invoices` paginated table → link to each invoice detail

### 6.3 Products (`/products`)

- **`src/api/products.ts`**
- **`src/routes/_auth.products.tsx`** — inline CRUD table (edit in place); CSV import via `POST /products/import-csv` multipart

### 6.4 Change Password (`/profile/change-password`)

- **`src/routes/_auth.profile.change-password.tsx`** — centred card layout
- react-hook-form + zod: `currentPassword`, `newPassword` (min 8 chars), `confirmNewPassword` (must match `newPassword`)
- On success: toast "Password changed — you'll be logged out" → `POST /auth/revoke-token` → clear auth store → redirect `/login`
- Reachable via TopBar user avatar dropdown ("Change Password" menu item)

### 6.5 UX polish (cross-cutting)

- **Sandbox environment banner**: persistent yellow bar across the top when `GET /reports/token-status` returns `environment === "Sandbox"` — "Sandbox mode — invoices are not submitted to live FBR"
- **Compliance onboarding modal**: one-time flag in `localStorage` (`zts_onboarding_seen`); shown to TenantAdmin on first login; explains April 2026 compliance deadline has passed and penalty risk
- Consistent loading skeletons (`shadcn/ui Skeleton`) on every data-fetching page
- Empty states with actionable CTAs on all tables (e.g. "No invoices yet — Create your first invoice")

---

## Cross-cutting concerns

### Role matrix (enforced via `<RequireRole>`)

| Section | Minimum role |
|---|---|
| Tenants management | SuperAdmin |
| User management | TenantAdmin |
| Branch management | TenantAdmin |
| API key creation | TenantAdmin |
| Scenario certify | TenantAdmin |
| Audit logs | BranchManager |
| Scenario run | BranchManager |
| Cancel invoice | BranchManager |
| Submit / validate invoice | Operator |
| Read-only everything else | Viewer |

> UI gating is UX, not security. The backend enforces roles on every endpoint independently.

### Zod schema highlights (mirrors server FluentValidation)

```ts
// NTN/CNIC — mirrors FBR_SELLER_001 / FBR_BUYER_002
sellerNtnCnic: z.string().refine(
  v => [7, 9, 13].includes(v.replace(/[-\s]/g, "").length),
  "NTN must be 7 or 9 digits; CNIC must be 13 digits"
)

// Invoice date — mirrors FBR_DATE_001
invoiceDate: z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(v => isWithinLast30Days(v), "Date must be within the last 30 days")

// InvoiceRefNo (Debit Note only) — mirrors FBR_REF_002
invoiceRefNo: z.string()
  .refine(v => !v || v.length === 22 || v.length === 28, "Must be 22 or 28 digits")
  .optional()
```

The server is always the source of truth — **always re-display server errors** even when client validation passes (compliance and financial-integrity rules can only fire server-side).

### Reference data cache strategy

| Endpoint | Cache | Key |
|---|---|---|
| `GET /reference/provinces` | 24h | `["provinces"]` |
| `GET /reference/hs-codes?search=` | 1h | `["hs-codes", search]` |
| `GET /reference/uom?hsCode=` | 1h | `["uom", hsCode]` |
| `GET /reference/rates` | 1h | `["rates", params]` |
| `GET /reference/sro-schedule` | 1h | `["sro-schedule", params]` |
| `GET /reference/sro-items` | 1h | `["sro-items", params]` |
| `GET /reference/document-types` | 24h | `["doc-types"]` — *blocked by backend H4* |
| `GET /reference/transaction-types` | 24h | `["transaction-types"]` — *blocked by backend H4; until then `transTypeId` is hardcoded in rate calls* |
| `GET /reference/statl` | No cache | Live FBR call |
| `GET /reference/registration-type` | No cache | Live FBR call |

### Backend gaps — what to skip or work around

| Gap ID | Missing feature | Frontend action |
|---|---|---|
| H1 | `POST /di/{id}/retry` | Retry button hidden on invoice detail |
| H2 | Excel upload status endpoint | After upload, redirect to `?status=Pending` filter |
| H3 | Webhook test-fire endpoint | No test button; webhook URL still saved via settings |
| H4 | Document Type / Transaction Type lookups | `transTypeId` hardcoded in rate calls; Doc Type dropdown deferred until H4 ships |
| N1 | `GET /auth/me` | Cache `AuthResponse.user` in zustand; re-login refreshes it |
| B1 | Scenario payloads are boilerplate | Warning banner on scenarios page |
| B2 | Debit Note `Reason` / `ReasonRemarks` fields | **Render the inputs now** (zod-validated client-side), include them in the submit body. Show inline yellow warning until backend B2 lands ("FBR will reject until backend B2 ships"). One-line cutover when backend adds the fields to `PostInvoiceRequest`. |
| N4 | `Tenant.BusinessType` + `Sector` fields | Phase 2 Tenant Overview tab dropdowns; Phase 3 scenario filtering. **Hard dependency for Phase 2 + Phase 3** — promoted out of "nice-to-have" in backend plan. |
| — | Credit Note `InvoiceType` enum value | Backend `InvoiceType` enum has only `SaleInvoice` + `DebitNote` today. If business decides Credit Notes are in scope, backend adds `CreditNote = 3` and frontend appends to the invoiceType select + reuses Reason/Remarks fields. |

---

## Target file tree

```
zarntaxsync-web/
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
│   │   └── products.ts
│   ├── hooks/
│   │   ├── useInvoices.ts
│   │   ├── useReference.ts
│   │   ├── useDashboard.ts
│   │   ├── useTenants.ts
│   │   └── useScenarios.ts
│   ├── components/
│   │   ├── ui/                          (shadcn generated)
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
│       └── scenarioMatrix.ts          # FBR §10 business-activity → scenario IDs map
├── .env
├── .env.production
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Build sequence

| Phase | Days | Deliverable | Backend dependency |
|---|---|---|---|
| 0 — Scaffold | 1 | Dev server running, all dependencies installed | — |
| 1 — Auth + Shell | 2–3 | Login works, protected layout, role-aware sidebar | — |
| 2 — Tenant Onboarding | 4–7 | SuperAdmin: create tenant, upload FBR token, switch env, **set business activity + sector** | **N4** (Tenant.BusinessType) |
| 3 — Scenarios | 8–9 | Scenario dashboard filtered by business activity per FBR §10, run + certify flow | **N4** for filtering; B1 for valid payloads |
| 4 — Operator Flow | 10–15 | Dashboard, invoice list/detail/create/upload (incl. Reason/Remarks, SRO inputs) | **B2** (Reason/Remarks) before any debit-note submission; H4 for Doc/Trans Type dropdowns (else hardcode) |
| 5 — Admin Mgmt | 16–18 | Users, branches, API key one-time modal | — |
| 6 — Polish | 19–21 | Audit logs, reports, products, change-password, UX polish | — |

---

## Verification checkpoints

| Phase | Pass criteria |
|---|---|
| 0 | `npm run dev` → no errors at `localhost:5173` |
| 1 | Login → dashboard redirect; logout → `/login`; 401 replay with refresh token works |
| 2 | Full tenant onboarding end-to-end with backend running; token expiry badge renders; business activity + sector persist on Overview tab |
| 3 | Applicable scenarios load per tenant business activity (Manufacturer + Steel → 3 rows; Retailer + All Other Sectors → 16 rows incl. SN026–028); Run triggers spinner + status update; Certify only on Passed rows; empty state shown when business activity is null |
| 4 | Invoice create → pre-flight → submit → IRN visible → PDF opens; Debit Note flow shows Reason + ReasonRemarks (required, with "Others" → remarks required); SRO Schedule + Item Serial dropdowns appear when sale type implies SRO; per-item rejection shows red dot + tooltip; cancel; Excel upload 202 |
| 5 | Create user → API key one-time modal copy; head-office deactivate button disabled |
| 6 | Audit log diff renders; compliance report shows PKR penalty; change-password forces re-login; webhook URL persists; buyer NTN shows SATL + registration badges |

---

*For API contracts and code snippets — see **Frontend Implementation Guide.md**.*
*For endpoint/DTO detail — see **Updated Technical Reference — Developers.md**.*
*For backend remaining work — see **Implementation Plan.md**.*
