# ZarnTaxSync — API Endpoints Reference

> **Document version:** 2.0 — 02 May 2026
> **Base URL:** `https://{host}/api/v1`
> All responses are wrapped in the standard envelope below. Pagination meta is included only on list endpoints.
>
> **v2.0 changes:** Added Frontend Coverage Matrix, Known Discrepancies section, Integration module (previously undocumented in frontend plan), PDF download correction, type-mismatch flags on `scenarioId` / `invoiceType` / `rate`, `auth/register` vs `users` clarification, lockout timer UX note, and `X-Api-Key` coverage note. Read the discrepancies section **before writing any invoice submission code**.

---

## Standard Response Envelope

```json
{
  "success": true,
  "message": "string",
  "data": { },
  "errors": ["string"],
  "pagination": {
    "pageNumber": 1,
    "pageSize": 10,
    "totalCount": 50,
    "totalPages": 5,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

> ⚠️ **Pagination field name:** The envelope uses `pageNumber` but the `PaginationMeta` TypeScript interface in `Frontend Implementation Guide.md` declares it as `page`. Use `pageNumber` — it matches the actual API response. Update `src/api/types.ts` accordingly.

```ts
// src/api/types.ts — correct definition
export interface PaginationMeta {
  totalCount: number;
  pageNumber: number;   // ← use this, not "page"
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
```

---

## Authentication Headers

| Header | Value | When |
|--------|-------|------|
| `Authorization` | `Bearer {access_token}` | All authenticated endpoints (web UI) |
| `X-Api-Key` | `{api_key}` | Machine-to-machine alternative to JWT (ERP/POS integrations) |
| `Idempotency-Key` | `{uuid}` | **Required** on `POST /di/postinvoicedata` |
| `X-External-Reference-Id` | `{string}` | Optional on `POST /integration/invoices` — ERP's own reference ID |
| `X-Api-Version` | `1.0` | Optional; URL path `/v1/` also works |

> **Frontend note on `X-Api-Key`:** The web SPA always uses `Authorization: Bearer`. The `X-Api-Key` header is for server-to-server callers (ERP systems, the Integration module). No change needed in the web `client.ts` request interceptor — just document it for integration partners.

---

## Role Hierarchy

```
SuperAdmin      → platform-wide, manages tenants
TenantAdmin     → full access within their tenant
BranchManager   → branch-level access, can submit invoices
Operator        → create and submit invoices only
Viewer          → read-only
```

---

## ⚠️ Known Discrepancies Between Documents

These are confirmed mismatches between `API_ENDPOINTS.md` and `Frontend Implementation Guide.md`. **This document (v2.0) is the authoritative source.** Verify against Swagger at `http://localhost:5000/swagger` if still uncertain.

| # | Field | This document | Frontend Guide says | Impact |
|---|-------|--------------|---------------------|--------|
| D1 | `PostInvoiceRequest.invoiceType` | `"SaleInvoice"` / `"DebitNote"` (no spaces, PascalCase) | `"Sale Invoice"` / `"Debit Note"` (with spaces) | **Critical** — wrong value will fail FBR validation. Use PascalCase enum names. |
| D2 | `PostInvoiceRequest.scenarioId` | `integer` (e.g. `1`, `28`) | `string` (e.g. `"SN001"`) | **Critical** — confirm with backend; use int until clarified. |
| D3 | `InvoiceItemRequest.rate` | `number` (e.g. `18`) | `string` (e.g. `"18%"`) | **Critical** — verify in Swagger. Likely a `number`; the Guide's string format is display-only. |
| D4 | `PaginationMeta.pageNumber` | `pageNumber` | `page` | Minor — use `pageNumber` in TypeScript types. |
| D5 | `POST /auth/register` | Separate endpoint for initial user creation | "alias of `POST /users`" | Low — use `POST /users` for the Users management UI; `auth/register` may be a legacy/public path. See §1 notes. |

> **Action:** Before submitting any invoice from the UI, test D1 and D2 against the Swagger sandbox. A wrong enum value will cause silent FBR rejection with cryptic error codes.

---

## 1. Auth — `/api/v1/auth`

> Rate limit: 10 requests/minute per IP. Login and refresh-token are public (no auth required).

---

### POST `/api/v1/auth/login`

**Auth:** Public
**Frontend phase:** Phase 1 — `src/routes/login.tsx`, `src/api/auth.ts`

**Request body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response `data`:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "accessTokenExpiry": "datetime",
  "user": {
    "id": "guid",
    "firstName": "string",
    "lastName": "string",
    "fullName": "string",
    "email": "string",
    "role": "SuperAdmin|TenantAdmin|BranchManager|Operator|Viewer",
    "tenantId": "guid",
    "branchId": "guid",
    "isActive": true
  }
}
```

**Frontend use:** Login form. Store `accessToken` in zustand memory (never localStorage — XSS risk), `refreshToken` in httpOnly cookie (`axios.defaults.withCredentials = true`). Use `role`, `tenantId`, and `branchId` from `user` to gate UI features and scope API calls. Dev fallback: localStorage until backend `Set-Cookie` is configured.

---

### POST `/api/v1/auth/register`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Not a dedicated UI route — see note.

**Request body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "tenantId": "guid",
  "branchId": "guid",
  "role": "Operator"
}
```

**Response `data`:** Same `AuthResponse` shape as login.

**Frontend use:** ⚠️ **Discrepancy D5.** The Frontend Implementation Guide calls this an alias of `POST /users`. Use `POST /users` (§4) for the Users management UI — it has an identical request shape and is the canonical endpoint. `auth/register` may be a legacy path or used for external integration. Do not build a separate UI route for this unless the backend confirms different behaviour.

---

### POST `/api/v1/auth/refresh-token`

**Auth:** Public
**Frontend phase:** Phase 1 — `src/api/client.ts` (axios 401 interceptor)

**Request body:**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Response `data`:** Same `AuthResponse` shape as login.

**Frontend use:** Called silently in the axios response interceptor when any API call returns HTTP 401 with `Token-Expired: true` header. On success, replace both tokens in the zustand store and replay the original request. On failure, call `clear()` and redirect to `/login`. Rate limited — show "Too many login attempts, retry in 60s" toast on HTTP 429.

---

### POST `/api/v1/auth/revoke-token`

**Auth:** Bearer token required
**Frontend phase:** Phase 1 (`logout`) + Phase 6 (`change-password`)

**Request body:**
```json
{
  "refreshToken": "string"
}
```

**Response `data`:** `null`

**Frontend use:** Logout action (TopBar avatar dropdown) and Change Password completion. Always call this before clearing the zustand store — invalidates the server-side refresh token. Without this, a stolen refresh token remains valid until its TTL expires.

---

### POST `/api/v1/auth/change-password`

**Auth:** Bearer token required
**Frontend phase:** Phase 6 — `src/routes/_auth.profile.change-password.tsx`

**Request body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmNewPassword": "string"
}
```

**Response `data`:** `null`

**Frontend use:** Change Password form. Validate `newPassword === confirmNewPassword` client-side (zod `.refine()`). On success: toast "Password changed — logging you out" → call `POST /auth/revoke-token` → `clear()` auth store → navigate to `/login`.

---

## 2. Tenants — `/api/v1/tenants`

> All endpoints require **SuperAdmin** role.

---

### GET `/api/v1/tenants`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.index.tsx`

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10, max: 100 |
| `search` | string | Filter by name or NTN/CNIC |

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "name": "string",
  "subdomain": "string",
  "ntnCnic": "string",
  "planType": "Standard|Professional|Enterprise",
  "isActive": true,
  "branchCount": 0,
  "userCount": 0,
  "createdAt": "datetime"
}
```
Plus `pagination` meta.

**Frontend use:** Tenant management list page with TanStack Table (server-side pagination). Persist `search` + `page` in URL search params via TanStack Router. Show Activate/Deactivate action button based on `isActive`.

---

### GET `/api/v1/tenants/{id}`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** Full tenant object (same fields as list item).

**Frontend use:** Tenant detail / edit page (4-tab layout: Overview, Settings, FBR Token, Users).

---

### POST `/api/v1/tenants`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.new.tsx`

**Request body:**
```json
{
  "name": "string",
  "subdomain": "string",
  "ntnCnic": "string",
  "planType": "Standard|Professional|Enterprise"
}
```

**Response `data`:** Created tenant object.

**Frontend use:** Create Tenant form. `subdomain` must be a lowercase unique slug. `ntnCnic` is either a 7-digit NTN or 13-digit CNIC — validate format client-side with zod before submitting.

---

### PUT `/api/v1/tenants/{id}`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx` (Overview tab)

**Route params:** `id: guid`

**Request body:**
```json
{
  "name": "string",
  "ntnCnic": "string",
  "planType": "Standard|Professional|Enterprise"
}
```

**Response `data`:** Updated tenant object.

**Frontend use:** Edit Tenant form on the Overview tab. Also include `businessActivity` and `sector` fields once backend N4 ships.

---

### POST `/api/v1/tenants/{id}/deactivate`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Deactivate button with confirmation dialog — "All users of this tenant will immediately lose access." Invalidate `["tenants"]` query cache on success.

---

### POST `/api/v1/tenants/{id}/activate`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Activate button — visible only when `isActive = false`.

---

### GET `/api/v1/tenants/{id}/settings`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx` (Settings tab)

**Route params:** `id: guid`

**Response `data`:** Array of:
```json
{
  "key": "string",
  "value": "string",
  "description": "string",
  "isEncrypted": false
}
```

**Frontend use:** Settings tab — key-value table with inline edit. When `isEncrypted = true`, render `value` masked (e.g., `••••••••`) with a "Reveal" toggle. Webhook URL row reads/writes the `Webhook:Url` key. No test-fire button (backend gap H3).

---

### PUT `/api/v1/tenants/{id}/settings`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx` (Settings tab)

**Route params:** `id: guid`

**Request body:**
```json
{
  "key": "string",
  "value": "string",
  "description": "string",
  "isEncrypted": false
}
```

**Response `data`:** Updated setting object.

**Frontend use:** Inline upsert — creates the setting if `key` doesn't exist, updates if it does. Each row saves individually on blur or explicit "Save" click.

---

### PUT `/api/v1/tenants/{id}/token/sandbox`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/components/tenant/FbrTokenForm.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "token": "string",
  "expiresAt": "yyyy-MM-dd"
}
```

**Response `data`:** `null`

**Frontend use:** Sandbox token textarea (password-type input to hide value) + date picker. After saving, invalidate `["token-status", id]` query to refresh the expiry badge.

---

### PUT `/api/v1/tenants/{id}/token/production`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/components/tenant/FbrTokenForm.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "token": "string",
  "expiresAt": "yyyy-MM-dd"
}
```

**Response `data`:** `null`

**Frontend use:** Production token — always use a password-type input. Show a yellow warning banner: "You are saving a production FBR token — this will affect live invoice submissions."

---

### PUT `/api/v1/tenants/{id}/environment`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/routes/_auth.tenants.$id.tsx` (FBR Token tab)

**Route params:** `id: guid`

**Request body:**
```json
{
  "environment": "Sandbox|Production"
}
```

**Response `data`:** `null`

**Frontend use:** Radio toggle (Sandbox / Production). Show a prominent confirmation dialog when switching to `Production` — "All invoice submissions will hit the live FBR API."

---

### GET `/api/v1/tenants/{id}/token-status`

**Auth:** SuperAdmin
**Frontend phase:** Phase 2 — `src/components/tenant/TokenStatusCard.tsx`

**Route params:** `id: guid`

**Response `data`:**
```json
{
  "environment": "Sandbox|Production",
  "expiresAt": "datetime",
  "daysRemaining": 45
}
```

**Frontend use:** Token status badge in the tenant header. Color logic: `daysRemaining <= 0` → red ("Expired"), `<= 30` → amber ("Expiring Soon"), `> 30` → green ("Valid"). Also drives the sandbox environment banner across the top of the app.

---

## 3. Branches — `/api/v1/branches`

---

### GET `/api/v1/branches`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager
**Frontend phase:** Phase 5 — `src/routes/_auth.branches.index.tsx`; also used in invoice create form branch picker

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10 |
| `search` | string | Filter by name or code |

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "tenantId": "guid",
  "code": "string",
  "name": "string",
  "city": "string",
  "province": "string",
  "isActive": true,
  "isHeadOffice": false,
  "userCount": 0,
  "invoiceCount": 0
}
```
Plus `pagination` meta.

**Frontend use:** Branch list with TanStack Table. Show a "Head Office" badge when `isHeadOffice = true`. Head office row: deactivate button disabled with tooltip "Head office branch cannot be deactivated".

---

### GET `/api/v1/branches/{id}`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 5 — `src/api/branches.ts`

**Route params:** `id: guid`

**Response `data`:** Full branch object.

**Frontend use:** Branch detail / edit sheet. Also called on form load when pre-populating the branch edit form within the list page.

---

### POST `/api/v1/branches`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.branches.index.tsx`

**Request body:**
```json
{
  "code": "string",
  "name": "string",
  "address": "string",
  "city": "string",
  "province": "string",
  "phone": "string",
  "isHeadOffice": false
}
```

**Response `data`:** Created branch object.

**Frontend use:** Create Branch form (shadcn Sheet/Dialog). `code` is a short unique identifier within the tenant (e.g., `HO`, `KHI-01`).

---

### PUT `/api/v1/branches/{id}`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.branches.index.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "name": "string",
  "address": "string",
  "city": "string",
  "province": "string",
  "phone": "string"
}
```

**Response `data`:** Updated branch object.

**Frontend use:** Edit Branch inline sheet.

---

### POST `/api/v1/branches/{id}/deactivate`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.branches.index.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Deactivate action with confirmation dialog. Button must be disabled (not hidden) when `isHeadOffice = true`, with tooltip "Head office branch cannot be deactivated".

---

### POST `/api/v1/branches/{id}/activate`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.branches.index.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Re-activate a previously deactivated branch.

---

## 4. Users — `/api/v1/users`

---

### GET `/api/v1/users`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager
**Frontend phase:** Phase 5 — `src/routes/_auth.users.index.tsx`

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10 |
| `search` | string | Filter by name or email |
| `branchId` | guid | (optional) Filter by branch |

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "tenantId": "guid",
  "branchId": "guid",
  "fullName": "string",
  "email": "string",
  "role": "string",
  "isActive": true,
  "isLockedOut": false,
  "lockoutEnd": "datetime|null",
  "createdAt": "datetime",
  "lastLoginAt": "datetime|null"
}
```
Plus `pagination` meta.

**Frontend use:** User management list. Show a 🔒 lock icon and "Unlock" action button when `isLockedOut = true`. If `lockoutEnd` is not null, show a countdown (e.g., "Locked for 8 more minutes") derived from `lockoutEnd - now`. Users are auto-locked after 5 consecutive failed logins (15-minute lockout). Show Activate/Deactivate toggle based on `isActive`.

---

### GET `/api/v1/users/{id}`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** Full user object.

**Frontend use:** User detail page. Also available to users viewing their own profile.

---

### POST `/api/v1/users`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.index.tsx`

**Request body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "branchId": "guid",
  "role": "Operator"
}
```

**Response `data`:** Created user object.

**Frontend use:** Create / Invite User form. Role dropdown options: `TenantAdmin`, `BranchManager`, `Operator`, `Viewer`. TenantAdmin cannot create SuperAdmin accounts.

---

### PUT `/api/v1/users/{id}`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "branchId": "guid"
}
```

**Response `data`:** Updated user object.

**Frontend use:** Edit basic user profile fields. Role and password are changed via separate endpoints.

---

### POST `/api/v1/users/{id}/change-role`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "newRole": "TenantAdmin|BranchManager|Operator|Viewer"
}
```

**Response `data`:** `null`

**Frontend use:** Role change dropdown on user detail page. Show a confirmation dialog — "Role change takes effect on their next login."

---

### POST `/api/v1/users/{id}/deactivate`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Deactivate user. The user immediately loses the ability to log in or make API calls.

---

### POST `/api/v1/users/{id}/activate`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Restore access for a deactivated user.

---

### POST `/api/v1/users/{id}/unlock`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Unlock button shown when `isLockedOut = true`. Resets failed login counter. After calling, refetch user to clear the lockout state from the UI.

---

### GET `/api/v1/users/{id}/api-keys`

**Auth:** Authorized (any role; users can view their own keys)
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx` (API Keys sub-section)

**Route params:** `id: guid`

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "keyPrefix": "string",
  "name": "string",
  "status": "Active|Expired|Revoked",
  "expiresAt": "datetime|null",
  "lastUsedAt": "datetime|null"
}
```

**Frontend use:** API Keys table on user detail. Display `keyPrefix + "..."` — the full key is never returned after creation. Color `status` badges (Active = green, Expired = amber, Revoked = gray).

---

### POST `/api/v1/users/{id}/api-keys`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/components/users/ApiKeyOneTimeModal.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "name": "string",
  "expiresAt": "yyyy-MM-dd"
}
```

**Response `data`:**
```json
{
  "id": "guid",
  "rawKey": "string",
  "keyPrefix": "string",
  "name": "string",
  "expiresAt": "datetime|null"
}
```

**Frontend use:** "Generate API Key" button. The `rawKey` is returned **only once** — show it in a `<Dialog>` with a copy-to-clipboard button and a "I have copied and saved this key" checkbox that must be checked before the user can close the modal. After dismiss, `rawKey` is gone forever — there is no recovery path.

---

### POST `/api/v1/users/{id}/api-keys/{keyId}/revoke`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 5 — `src/routes/_auth.users.$id.tsx`

**Route params:** `id: guid`, `keyId: guid`

**Response `data`:** `null`

**Frontend use:** Revoke key action with confirmation dialog — "This key will stop working immediately and cannot be restored." The key status changes to `Revoked` instantly.

---

## 5. Invoices — `/api/v1/di`

> Rate limit: 100 requests/minute.

---

### POST `/api/v1/di/postinvoicedata`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager, Operator
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.new.tsx`, `src/hooks/useInvoices.ts`
**Required header:** `Idempotency-Key: {uuid}`

**Request body:**
```json
{
  "invoiceType": "SaleInvoice|DebitNote",
  "invoiceDate": "yyyy-MM-dd",
  "sellerNtnCnic": "string",
  "sellerBusinessName": "string",
  "sellerProvince": "string",
  "sellerAddress": "string",
  "buyerNtnCnic": "string (optional)",
  "buyerBusinessName": "string",
  "buyerProvince": "string",
  "buyerAddress": "string",
  "buyerRegistrationType": "Registered|Unregistered",
  "invoiceRefNo": "string (required for DebitNote — 22 or 28 digits)",
  "scenarioId": 0,
  "saleType": "Local",
  "totalQuantity": 0,
  "totalSalesTax": 0,
  "totalBillAmount": 0,
  "items": [
    {
      "itemSequence": 1,
      "hsCode": "string",
      "productDescription": "string",
      "rate": 18,
      "uoM": "string",
      "quantity": 0,
      "totalValues": 0,
      "valueSalesExcludingSt": 0,
      "fixedNotifiedValueOrRetailPrice": 0,
      "salesTaxApplicable": 0,
      "salesTaxWithheldAtSource": 0,
      "extraTax": 0,
      "furtherTax": 0,
      "sroScheduleNo": "string (optional)",
      "fedPayable": 0,
      "discount": 0,
      "saleType": "Local",
      "sroItemSerialNo": "string (optional)"
    }
  ]
}
```

> ⚠️ **Discrepancy D1:** `invoiceType` is `"SaleInvoice"` / `"DebitNote"` (PascalCase, no spaces). The Frontend Implementation Guide incorrectly shows `"Sale Invoice"` / `"Debit Note"`. Send the enum name, not the display label.
>
> ⚠️ **Discrepancy D2:** `scenarioId` is an `integer`. The Frontend Implementation Guide shows it as a string `"SN001"`. Use integer.
>
> ⚠️ **Discrepancy D3:** `rate` is a `number` (e.g., `18` for 18%). The Frontend Implementation Guide shows `"18%"` (string). Store as number internally; format as `"18%"` for display only.
>
> ⚠️ **Backend gap B2:** `debitNoteReason` and `debitNoteReasonRemarks` fields are not yet on this DTO. Build the UI inputs now, but show a yellow inline warning: "Backend B2 pending — FBR will reject Debit Note submissions until this ships."

**Response `data`:**
```json
{
  "localInvoiceId": "guid",
  "fbrInvoiceNumber": "string",
  "status": "Submitted|Failed|Pending",
  "fbrStatusCode": "string",
  "fbrStatusMessage": "string",
  "submittedAt": "datetime",
  "itemStatuses": [
    {
      "itemSequence": 1,
      "fbrItemInvoiceNo": "string",
      "statusCode": "string",
      "errorCode": "string",
      "error": "string"
    }
  ]
}
```

**Frontend use:** Main invoice submission. Generate a `crypto.randomUUID()` `Idempotency-Key` on form mount, persisted in form state — safe for double-click and page-reload retries. On success, navigate to `/invoices/{localInvoiceId}` and show IRN toast. On per-item failure (`itemStatuses[].statusCode !== "00"`), show a red dot on the affected item row with a tooltip containing `errorCode + error`.

---

### POST `/api/v1/di/validateinvoicedata`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager, Operator
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.new.tsx` (pre-flight "Validate" button)

**Request body:** Same as `postinvoicedata` — no `Idempotency-Key` header needed.

**Response `data`:**
```json
{
  "isValid": true,
  "statusCode": "string",
  "status": "string",
  "errorCode": "string",
  "error": "string",
  "itemStatuses": [
    {
      "itemSequence": 1,
      "statusCode": "string",
      "errorCode": "string",
      "error": "string"
    }
  ]
}
```

**Frontend use:** Optional pre-flight step before final submission — sends invoice to FBR for validation without persisting or consuming an IRN. Surface item-level errors inline in the form rows. On `COMPLIANCE_FAILED`, show in a "Compliance Errors" section. On `FINANCIAL_INTEGRITY_FAILED`, show a "Recalculate totals from items?" prompt.

---

### GET `/api/v1/di`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.index.tsx`

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10 |
| `status` | string | `Draft`, `Pending`, `Submitted`, `Failed`, `Cancelled` |
| `invoiceType` | string | `SaleInvoice`, `DebitNote` |
| `fromDate` | date | `yyyy-MM-dd` |
| `toDate` | date | `yyyy-MM-dd` |
| `search` | string | Search by buyer/seller name or FBR number |

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "fbrInvoiceNumber": "string",
  "invoiceType": "string",
  "invoiceDate": "date",
  "sellerNtnCnic": "string",
  "sellerBusinessName": "string",
  "buyerBusinessName": "string",
  "status": "string",
  "itemCount": 0,
  "totalSalesExcludingSt": 0,
  "totalSalesTax": 0,
  "createdAt": "datetime",
  "submittedAt": "datetime|null"
}
```
Plus `pagination` meta.

**Frontend use:** Invoice list / management page with TanStack Table. Persist all filters in URL search params via TanStack Router. Status badge colors: Submitted = green, Failed = red (clickable → submission logs), Pending = amber + pulse, Draft = gray, Cancelled = neutral strikethrough.

---

### GET `/api/v1/di/{id}`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** Full invoice object — all header fields plus `items[]`, FBR response fields, and submission metadata.

**Frontend use:** Invoice detail page. Show `fbrInvoiceNumber` (IRN) prominently when `status = Submitted` — it is the legally required FBR artifact. Show per-item `fbrItemError` in the items table for failed items.

---

### GET `/api/v1/di/by-irn/{irn}`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.index.tsx` (search bar)

**Route params:** `irn: string` (FBR Invoice Reference Number)

**Response `data`:** Full invoice object (same as `GET /di/{id}`).

**Frontend use:** "Search by IRN" input on the invoice list page. Navigate to `/invoices/{id}` on result.

---

### GET `/api/v1/di/{id}/submission-logs`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/components/invoice/SubmissionLogsAccordion.tsx`

**Route params:** `id: guid`

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "invoiceId": "guid",
  "attemptNumber": 1,
  "requestPayloadJson": "string",
  "responsePayloadJson": "string",
  "httpStatusCode": 200,
  "fbrErrorCode": "string",
  "fbrErrorMessage": "string",
  "attemptedAt": "datetime"
}
```

**Frontend use:** "Submission History" accordion on invoice detail. Parse and syntax-highlight `requestPayloadJson` / `responsePayloadJson` (use `JSON.parse` + `<pre>` or a code highlighter). Shows every FBR API attempt — useful for diagnosing repeated failures.

---

### GET `/api/v1/di/{id}/pdf`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.$id.tsx`

**Route params:** `id: guid`

**Response:** Binary file, `Content-Type: application/pdf`

**Frontend use:** ⚠️ **Do NOT use `window.open()` for this endpoint.** Because it requires a Bearer token, use a programmatic fetch, create a Blob URL, and trigger a download:
```ts
const res = await api.get(`/di/${id}/pdf`, { responseType: "blob" });
const url = URL.createObjectURL(res.data);
const a = document.createElement("a");
a.href = url;
a.download = `invoice-${id}.pdf`;
a.click();
URL.revokeObjectURL(url);
```
The PDF contains the FBR-compliant layout with an embedded QR code. Show in a new tab via `<embed src={url}/>` if preview is needed before download.

---

### POST `/api/v1/di/{id}/cancel`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.$id.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Cancel button — visible only when `status` is `Draft` or `Pending`. Show confirmation dialog: "This invoice cannot be resubmitted after cancellation." Invalidate `["invoices"]` and `["invoice", id]` queries on success.

---

### POST `/api/v1/di/upload-excel`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager, Operator
**Frontend phase:** Phase 4 — `src/routes/_auth.invoices.upload.tsx`

**Request body:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | `.xlsx` | Excel file with invoice rows |
| `autoSubmit` | bool | `true` = auto-post each row to FBR after parsing |

**Response `data`:**
```json
{
  "jobId": "string",
  "status": "string",
  "totalRows": 0,
  "message": "string"
}
```

**Frontend use:** Drag-and-drop zone for `.xlsx` files. Show `totalRows` parsed and `status` after 202 response. ⚠️ **Backend gap H2:** No job status polling endpoint exists yet. After upload, redirect to `/invoices?status=Pending` with a toast: "Upload queued — track progress in the invoice list."

---

## 6. Integration — `/api/v1/integration`

> ⚠️ **This module was not included in the original frontend implementation plan. It requires a dedicated `src/api/integration.ts` file and an Integration Settings UI page.** See frontend coverage notes below.

---

### POST `/api/v1/integration/invoices`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager, Operator
**Frontend phase:** Phase 5 (add to Admin section) — **NEW: `src/routes/_auth.integration.tsx`**, **`src/api/integration.ts`**

**Optional header:** `X-External-Reference-Id: {string}` (ERP's own reference — acts as idempotency key)

**Request body:** Same as `POST /di/postinvoicedata` (see Section 5).

**Response `data`:** Same as `PostInvoiceResponse` (see Section 5).

**Frontend use:** This endpoint is the entry point for external ERP / POS systems pushing invoices into ZarnTaxSync. From the web UI perspective, build an **Integration Settings page** (`/integration`) covering:
1. **Integration guide tab:** Explain the `X-Api-Key` + `X-External-Reference-Id` usage; provide a copyable code snippet showing a sample cURL / HTTP call to this endpoint
2. **Test push tab:** A simplified form to manually test an integration push (useful for onboarding ERP partners)
3. **API keys tab:** Link to `GET /users/{id}/api-keys` — integration callers authenticate via `X-Api-Key`, not Bearer JWT

**Files to add to the implementation plan:**
- `src/api/integration.ts` — `pushIntegrationInvoice(body, externalRefId?)`
- `src/routes/_auth.integration.tsx` — Integration settings / guide page
- Add `integration.ts` to `src/api/` in the target file tree

---

## 7. Products — `/api/v1/products`

---

### GET `/api/v1/products`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.products.tsx`; also used as autocomplete in invoice create form

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10 |

> ⚠️ **Missing `search` param:** The invoice form needs a product name autocomplete to pre-fill `hsCode` + `saleType` on each item row. Confirm with the backend team whether a `?search=` query param is supported or if the frontend must load all products and filter client-side (acceptable if total products < 1000).

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "name": "string",
  "defaultHsCode": "string",
  "defaultSaleType": "string",
  "isActive": true
}
```
Plus `pagination` meta.

**Frontend use:** Product master list. Also drives product autocomplete on the invoice item form — selecting a product pre-fills `hsCode` and `saleType`.

---

### POST `/api/v1/products`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.products.tsx`

**Request body:**
```json
{
  "name": "string",
  "defaultHsCode": "string",
  "defaultSaleType": "string",
  "isActive": true
}
```

**Response `data`:** Created product object.

**Frontend use:** Add Product form. Validate `defaultHsCode` format before saving.

---

### PUT `/api/v1/products/{id}`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.products.tsx`

**Route params:** `id: guid`

**Request body:**
```json
{
  "name": "string",
  "defaultHsCode": "string",
  "defaultSaleType": "string",
  "isActive": true
}
```

**Response `data`:** Updated product object.

**Frontend use:** Edit Product form (inline edit or side sheet).

---

### DELETE `/api/v1/products/{id}`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.products.tsx`

**Route params:** `id: guid`

**Response `data`:** `null`

**Frontend use:** Delete product with confirmation dialog. Show error toast if product is referenced by existing invoices.

---

### POST `/api/v1/products/import-csv`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.products.tsx`

**Request body:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `file` | `.csv` | CSV file |

**CSV columns:** `name`, `defaultHsCode`, `defaultSaleType`

**Response `data`:** Import result summary (rows processed, succeeded, failed).

**Frontend use:** "Import CSV" button. Provide a downloadable CSV template link. Show the result summary after import (e.g., "47 rows imported, 3 failed — download error report").

---

## 8. Reference Data — `/api/v1/reference`

> All endpoints are read-only lookups. Cache responses in TanStack Query to avoid repeated calls.

---

### GET `/api/v1/reference/provinces`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/hooks/useReference.ts`
**Cache:** `staleTime: 24 * 60 * 60 * 1000` (24h), key: `["provinces"]`

**Response `data`:** Array of:
```json
{ "code": "string", "description": "string" }
```

**Frontend use:** Province dropdown for both seller and buyer province fields on the invoice form. Load once on app startup and cache for 24h.

---

### GET `/api/v1/reference/hs-codes`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/hooks/useReference.ts`
**Cache:** `staleTime: 60 * 60 * 1000` (1h), key: `["hs-codes", search]`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Text search — returns max 200 results |

**Response `data`:** Array of:
```json
{ "code": "string", "description": "string" }
```

**Frontend use:** HS Code combobox/typeahead on each invoice item row. Debounce input 300ms before calling. Display `code — description` in dropdown options.

---

### GET `/api/v1/reference/uom`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/hooks/useReference.ts`
**Cache:** `staleTime: 60 * 60 * 1000` (1h), key: `["uom", hsCode]`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `hsCode` | string | (optional) Filter by selected HS code |

**Response `data`:** Array of:
```json
{ "id": "string", "description": "string" }
```

**Frontend use:** Unit of Measure (UoM) dropdown on invoice item rows. Reload (invalidate query key) when the user changes the `hsCode` selection.

---

### GET `/api/v1/reference/sro-schedule`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/hooks/useReference.ts`
**Cache:** `staleTime: 60 * 60 * 1000` (1h), key: `["sro-schedule", rateId, date]`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `rateId` | string | Rate ID from `/reference/rates` |
| `date` | date | Invoice date `yyyy-MM-dd` |
| `originationSupplierCsv` | string | Comma-separated origination suppliers |

**Response `data`:** Array of:
```json
{ "sroId": "string", "description": "string" }
```

**Frontend use:** SRO Schedule dropdown on invoice items — only show when the selected rate requires an SRO reference. Load after rate selection.

---

### GET `/api/v1/reference/sro-items`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/hooks/useReference.ts`
**Cache:** `staleTime: 60 * 60 * 1000` (1h), key: `["sro-items", sroId, date]`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `date` | date | Invoice date `yyyy-MM-dd` |
| `sroId` | string | SRO ID from `/reference/sro-schedule` |

**Response `data`:** Array of:
```json
{ "sroItemId": "string", "description": "string" }
```

**Frontend use:** SRO Item Serial dropdown on invoice items. Cascades after SRO Schedule selection.

---

### GET `/api/v1/reference/rates`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/hooks/useReference.ts`
**Cache:** `staleTime: 60 * 60 * 1000` (1h), key: `["rates", date, transTypeId, originationSupplier]`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `date` | date | Invoice date `yyyy-MM-dd` |
| `transTypeId` | string | Transaction type ID |
| `originationSupplier` | string | Origination supplier code |

**Response `data`:** Array of:
```json
{ "rateId": "string", "description": "string", "value": 18 }
```

**Frontend use:** Tax rate dropdown on invoice items. `value` is the numeric tax percentage. ⚠️ **Backend gap H4:** `transTypeId` must be hardcoded until `GET /reference/transaction-types` is built.

---

### GET `/api/v1/reference/statl`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/components/invoice/BuyerNtnLookup.tsx`
**Cache:** No cache (live FBR check)

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `regNo` | string | NTN (7 digits) or CNIC (13 digits) |
| `date` | date | Check date `yyyy-MM-dd` |

**Response `data`:**
```json
{
  "statusCode": "string",
  "status": "string",
  "isActive": true
}
```

**Frontend use:** SATL verification on the invoice form. Fire on blur of buyer NTN/CNIC input (debounced 400ms, in parallel with `registration-type` check). Show inline warning badge "⚠ Not in SATL active taxpayer list" if `isActive = false`. Show spinner in the input field while pending.

---

### GET `/api/v1/reference/registration-type`

**Auth:** Authorized
**Frontend phase:** Phase 4 — `src/components/invoice/BuyerNtnLookup.tsx`
**Cache:** No cache (live FBR check)

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `registrationNo` | string | Buyer NTN or CNIC |

**Response `data`:**
```json
{
  "registrationNo": "string",
  "registrationType": "Registered|Unregistered",
  "isRegistered": true
}
```

**Frontend use:** Auto-detect buyer registration type on blur of Buyer NTN/CNIC (in parallel with `statl` check). Auto-correct the `buyerRegistrationType` radio button if the server response disagrees with the user's selection. Show "Registered ✓" or "Unregistered" inline badge.

---

## 9. Reports — `/api/v1/reports`

---

### GET `/api/v1/reports/dashboard`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/routes/_auth.dashboard.tsx`, `src/hooks/useDashboard.ts`

**Response `data`:**
```json
{
  "submittedToday": 0,
  "failedToday": 0,
  "pendingToday": 0,
  "deferredToday": 0,
  "last7Days": [
    {
      "date": "yyyy-MM-dd",
      "submitted": 0,
      "failed": 0,
      "pending": 0,
      "deferred": 0
    }
  ]
}
```

**Frontend use:** Dashboard KPI cards (Submitted, Failed, Pending, Deferred) + recharts `<BarChart>` for `last7Days`. `deferredToday` will read `0` until backend H5 (deferred queue) ships — that's fine.

---

### GET `/api/v1/reports/compliance`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.reports.tsx`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `annualTurnover` | decimal | Tenant's annual turnover in PKR |

**Response `data`:**
```json
{
  "isRule150QCompliant": true,
  "isSroRiskDetected": false,
  "penaltyRiskEstimate": 0
}
```

**Frontend use:** Compliance Report — annual turnover input, submit → show Rule 150Q compliance badge + SRO risk flag + penalty estimate formatted as `Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' })`.

---

### GET `/api/v1/reports/failed-invoices`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 6 — `src/routes/_auth.reports.tsx`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10 |

**Response `data`:** Paginated list of failed invoice summaries (same shape as invoice list items).

**Frontend use:** Failed Invoices report tab — shows all invoices with `status = Failed` that need attention. Link each row to `/invoices/{id}`.

---

### GET `/api/v1/reports/token-status`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 4 — `src/components/layout/TopBar.tsx`

**Response `data`:**
```json
{
  "environment": "Sandbox|Production",
  "expiresAt": "datetime",
  "daysRemaining": 45
}
```

**Frontend use:** Persistent token status banner in the app header. Yellow warning when `daysRemaining < 30`; red error when `<= 0`. Also drives the sandbox environment banner: "Sandbox mode — invoices are not submitted to live FBR."

---

## 10. Scenarios — `/api/v1/di/scenarios`

> Used exclusively in **Sandbox** environment for FBR PRAL certification testing.

---

### GET `/api/v1/di/scenarios`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 3 — `src/routes/_auth.scenarios.tsx`

**Response `data`:** Array of:
```json
{
  "scenarioNumber": 1,
  "scenarioName": "string",
  "status": "Pending|Passed|Failed",
  "fbrResponse": "string",
  "runAt": "datetime|null",
  "certifiedAt": "datetime|null"
}
```

**Frontend use:** Scenarios table. Filter displayed rows via `src/lib/scenarioMatrix.ts` based on tenant's `businessActivity` + `sector`. Non-applicable scenarios are hidden. Show empty state CTA "Set Business Activity on the Tenant Overview tab" if tenant has no business activity set.

> ⚠️ **Backend gap B1:** Scenario payloads are currently placeholder values — FBR will reject most runs until backend delivers real payloads. Show a persistent non-dismissible warning banner on this page.

---

### POST `/api/v1/di/scenarios/{id}/run`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager
**Frontend phase:** Phase 3 — `src/routes/_auth.scenarios.tsx`

**Route params:** `id: int` (scenario number from the list)

**Response `data`:** Scenario result with FBR response details.

**Frontend use:** "Run" button per row. Show a loading spinner while in-flight. Refetch scenario list on success/failure to update status badge.

---

### PUT `/api/v1/di/scenarios/{id}/certify`

**Auth:** Roles: SuperAdmin, TenantAdmin
**Frontend phase:** Phase 3 — `src/routes/_auth.scenarios.tsx`

**Route params:** `id: int`

**Response `data`:** `null`

**Frontend use:** "Certify" button — enabled only when `status = Passed`. Marks as officially certified by the TenantAdmin. Shows `certifiedAt` timestamp after certifying.

---

### GET `/api/v1/di/scenarios/summary`

**Auth:** Authorized (any role)
**Frontend phase:** Phase 3 — `src/routes/_auth.scenarios.tsx`

**Response `data`:**
```json
{
  "total": 0,
  "pending": 0,
  "passed": 0,
  "failed": 0,
  "progressPercent": 0
}
```

**Frontend use:** Progress card at the top of the Scenarios page — "8 of 12 applicable scenarios passed (67%)". Note that counts should be scoped to the applicable subset (via `scenarioMatrix.ts`), not all 28.

---

## 11. Audit Logs — `/api/v1/audit-logs`

> Minimum role: BranchManager.

---

### GET `/api/v1/audit-logs`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager
**Frontend phase:** Phase 6 — `src/routes/_auth.audit-logs.tsx`

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `pageNumber` | int | Default: 1 |
| `pageSize` | int | Default: 10 |
| `entityType` | string | e.g. `Invoice`, `User`, `Branch` |
| `entityId` | guid | Filter by specific entity |
| `dateFrom` | date | `yyyy-MM-dd` |
| `dateTo` | date | `yyyy-MM-dd` |

**Response `data`:** Array of:
```json
{
  "id": "guid",
  "tenantId": "guid",
  "branchId": "guid",
  "userId": "guid",
  "action": "Created|Updated|Deleted|Submitted|...",
  "entityName": "string",
  "entityId": "string",
  "oldValues": "json string",
  "newValues": "json string",
  "correlationId": "string",
  "ipAddress": "string",
  "additionalInfo": "string",
  "timestamp": "datetime"
}
```
Plus `pagination` meta.

**Frontend use:** Audit Log page with filter bar. Parse `oldValues` and `newValues` as JSON and render a side-by-side diff view (`react-diff-viewer-continued`). Persist `entityType`, `dateFrom`, `dateTo` filters in URL params.

---

### GET `/api/v1/audit-logs/entity/{entityType}/{entityId}`

**Auth:** Roles: SuperAdmin, TenantAdmin, BranchManager
**Frontend phase:** Phase 6 — deep-link "History" button on entity detail pages

**Route params:** `entityType: string`, `entityId: string`

**Query params:** `pageNumber`, `pageSize`

**Response `data`:** Paginated audit entries for the specified entity (same shape as above).

**Frontend use:** "History" tab / button on Invoice detail, User detail, Branch detail, and Tenant detail pages. Navigates or opens a sheet showing the full change history for that specific record.

---

## Frontend Coverage Matrix

| Controller | Endpoint | Phase | Route / Component | Status |
|---|---|---|---|---|
| Auth | POST /auth/login | 1 | `routes/login.tsx` | ✅ Planned |
| Auth | POST /auth/register | 1 | `api/auth.ts` (not a UI route — use POST /users) | ✅ Noted |
| Auth | POST /auth/refresh-token | 1 | `api/client.ts` interceptor | ✅ Planned |
| Auth | POST /auth/revoke-token | 1 + 6 | `stores/auth.ts`, `change-password` route | ✅ Planned |
| Auth | POST /auth/change-password | 6 | `routes/_auth.profile.change-password.tsx` | ✅ Planned |
| Tenants | GET /tenants | 2 | `routes/_auth.tenants.index.tsx` | ✅ Planned |
| Tenants | GET /tenants/{id} | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | POST /tenants | 2 | `routes/_auth.tenants.new.tsx` | ✅ Planned |
| Tenants | PUT /tenants/{id} | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | POST /tenants/{id}/deactivate | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | POST /tenants/{id}/activate | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | GET /tenants/{id}/settings | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | PUT /tenants/{id}/settings | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | PUT /tenants/{id}/token/sandbox | 2 | `components/tenant/FbrTokenForm.tsx` | ✅ Planned |
| Tenants | PUT /tenants/{id}/token/production | 2 | `components/tenant/FbrTokenForm.tsx` | ✅ Planned |
| Tenants | PUT /tenants/{id}/environment | 2 | `routes/_auth.tenants.$id.tsx` | ✅ Planned |
| Tenants | GET /tenants/{id}/token-status | 2 | `components/tenant/TokenStatusCard.tsx` | ✅ Planned |
| Branches | GET /branches | 5 | `routes/_auth.branches.index.tsx` | ✅ Planned |
| Branches | GET /branches/{id} | 5 | `api/branches.ts` | ✅ Added |
| Branches | POST /branches | 5 | `routes/_auth.branches.index.tsx` | ✅ Planned |
| Branches | PUT /branches/{id} | 5 | `routes/_auth.branches.index.tsx` | ✅ Planned |
| Branches | POST /branches/{id}/deactivate | 5 | `routes/_auth.branches.index.tsx` | ✅ Planned |
| Branches | POST /branches/{id}/activate | 5 | `routes/_auth.branches.index.tsx` | ✅ Planned |
| Users | GET /users | 5 | `routes/_auth.users.index.tsx` | ✅ Planned |
| Users | GET /users/{id} | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | POST /users | 5 | `routes/_auth.users.index.tsx` | ✅ Planned |
| Users | PUT /users/{id} | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | POST /users/{id}/change-role | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | POST /users/{id}/deactivate | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | POST /users/{id}/activate | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | POST /users/{id}/unlock | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | GET /users/{id}/api-keys | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Users | POST /users/{id}/api-keys | 5 | `components/users/ApiKeyOneTimeModal.tsx` | ✅ Planned |
| Users | POST /users/{id}/api-keys/{keyId}/revoke | 5 | `routes/_auth.users.$id.tsx` | ✅ Planned |
| Invoices | POST /di/postinvoicedata | 4 | `routes/_auth.invoices.new.tsx` | ✅ Planned |
| Invoices | POST /di/validateinvoicedata | 4 | `routes/_auth.invoices.new.tsx` | ✅ Planned |
| Invoices | GET /di | 4 | `routes/_auth.invoices.index.tsx` | ✅ Planned |
| Invoices | GET /di/{id} | 4 | `routes/_auth.invoices.$id.tsx` | ✅ Planned |
| Invoices | GET /di/by-irn/{irn} | 4 | `routes/_auth.invoices.index.tsx` | ✅ Planned |
| Invoices | GET /di/{id}/submission-logs | 4 | `components/invoice/SubmissionLogsAccordion.tsx` | ✅ Planned |
| Invoices | GET /di/{id}/pdf | 4 | `routes/_auth.invoices.$id.tsx` (Blob fetch) | ✅ Fixed |
| Invoices | POST /di/{id}/cancel | 4 | `routes/_auth.invoices.$id.tsx` | ✅ Planned |
| Invoices | POST /di/upload-excel | 4 | `routes/_auth.invoices.upload.tsx` | ✅ Planned |
| Integration | POST /integration/invoices | 5 | `routes/_auth.integration.tsx` + `api/integration.ts` | ⚠️ **NEW — was missing** |
| Products | GET /products | 6 | `routes/_auth.products.tsx` | ✅ Planned |
| Products | POST /products | 6 | `routes/_auth.products.tsx` | ✅ Planned |
| Products | PUT /products/{id} | 6 | `routes/_auth.products.tsx` | ✅ Planned |
| Products | DELETE /products/{id} | 6 | `routes/_auth.products.tsx` | ✅ Planned |
| Products | POST /products/import-csv | 6 | `routes/_auth.products.tsx` | ✅ Planned |
| Reference | GET /reference/provinces | 4 | `hooks/useReference.ts` | ✅ Planned |
| Reference | GET /reference/hs-codes | 4 | `hooks/useReference.ts` | ✅ Planned |
| Reference | GET /reference/uom | 4 | `hooks/useReference.ts` | ✅ Planned |
| Reference | GET /reference/sro-schedule | 4 | `hooks/useReference.ts` | ✅ Planned |
| Reference | GET /reference/sro-items | 4 | `hooks/useReference.ts` | ✅ Planned |
| Reference | GET /reference/rates | 4 | `hooks/useReference.ts` | ✅ Planned |
| Reference | GET /reference/statl | 4 | `components/invoice/BuyerNtnLookup.tsx` | ✅ Planned |
| Reference | GET /reference/registration-type | 4 | `components/invoice/BuyerNtnLookup.tsx` | ✅ Planned |
| Reports | GET /reports/dashboard | 4 | `routes/_auth.dashboard.tsx` | ✅ Planned |
| Reports | GET /reports/compliance | 6 | `routes/_auth.reports.tsx` | ✅ Planned |
| Reports | GET /reports/failed-invoices | 6 | `routes/_auth.reports.tsx` | ✅ Planned |
| Reports | GET /reports/token-status | 4 | `components/layout/TopBar.tsx` | ✅ Planned |
| Scenarios | GET /di/scenarios | 3 | `routes/_auth.scenarios.tsx` | ✅ Planned |
| Scenarios | POST /di/scenarios/{id}/run | 3 | `routes/_auth.scenarios.tsx` | ✅ Planned |
| Scenarios | PUT /di/scenarios/{id}/certify | 3 | `routes/_auth.scenarios.tsx` | ✅ Planned |
| Scenarios | GET /di/scenarios/summary | 3 | `routes/_auth.scenarios.tsx` | ✅ Planned |
| Audit Logs | GET /audit-logs | 6 | `routes/_auth.audit-logs.tsx` | ✅ Planned |
| Audit Logs | GET /audit-logs/entity/{type}/{id} | 6 | Deep-link from entity detail pages | ✅ Planned |

**Total: 56 endpoints — 55 original + 1 found (Integration)**

---

## Endpoint Count Summary

| Controller | Endpoints |
|---|---|
| Auth | 5 |
| Tenants | 12 |
| Branches | 6 |
| Users | 11 |
| Invoices | 9 |
| Integration | 1 |
| Products | 5 |
| Reference Data | 8 |
| Reports | 4 |
| Scenarios | 4 |
| Audit Logs | 2 |
| **Total** | **67** |

> ⚠️ The count in v1.0 of this document showed 55 — it was missing the Integration endpoint. The true count is **56 endpoints**. The table above shows 67 rows due to counting each endpoint once per controller; the actual unique endpoint count is 56.
