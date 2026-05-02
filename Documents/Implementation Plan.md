# ZarnTaxSync — Backend Remaining Work

**Audience:** Backend developers
**Document version:** 4.1 — verified against codebase, 26 April 2026 (N4 promoted to High priority as a frontend Phase 2/3 dependency; B2 sequencing tightened; Credit Note scope flagged)
**Scope:** Backend gaps only. Frontend work tracked separately in *Frontend Implementation Guide.md*.

---

## Snapshot

| Category | Items | Effort |
|---|---|---|
| 🔴 Go-live blockers (FBR rejection / legal / security) | 4 | ~3 dev-days |
| 🟡 High priority (operational quality + frontend dependencies) | 6 | ~4.5 dev-days |
| 🟢 Nice-to-have (post go-live) | 5 | ~5 dev-days |
| ❓ Open scope decisions | 1 | TBD |

The system is **~90% complete**. Core invoice submission, PDF + QR, debit-note basic validation, scenario controller, FBR token management, webhooks, ERP integration, products, reports, audit, compliance engine, financial integrity — **all built and working**. What follows is what actually still blocks production.

---

## 🔴 Go-live blockers

These prevent FBR certification, fail FBR submissions, or are security-critical.

### B1 — Real payloads for the 28 sandbox scenarios   `~1.5 days`

**Problem.** [`ScenarioTestService.BuildScenarioPayload`](../src/ZarnTaxSync.Infrastructure/Services/ScenarioTestService.cs) returns the same boilerplate for all 28 scenarios — only the `ScenarioId` text changes. PRAL will reject most because each scenario requires its specific business shape (Steel sale type, Petroleum, EV, Mobile Phones, 3rd-Schedule, Cement, etc.).

**Fix.**
1. Replace the single-payload method with a `Dictionary<int, Func<FbrInvoiceRequest>>` keyed by scenario number (1–28)
2. Each builder produces the FBR-mandated combination of `saleType`, `hsCode`, `rate`, item structure for that scenario per FBR DI API V1.12 (§Sandbox Scenarios)
3. Scenarios 26/27/28 are retailer-only — guard with a tenant business-type setting, return a clear error if not retailer
4. Persist `ScenarioName` from a static dictionary (currently `"Scenario 01"` etc.; should be the FBR-documented name like *"Goods at standard rate to registered buyers"*)

**Files touched.**
- `Infrastructure/Services/ScenarioTestService.cs` (rewrite `BuildScenarioPayload`)

**Verification.** Run all 28 scenarios against PRAL sandbox → all return `statusCode: "00"`.

---

### B2 — Debit Note `Reason` and `ReasonRemarks` fields   `~0.5 days + migration`

**Problem.** FBR DI API V1.12 documents two error codes the system can't satisfy:
- `0030` — "Reason is required" for debit/credit notes
- `0031` — "Reason Remarks are required" if reason = "Others"

Currently `Invoice` has no `DebitNoteReason` / `DebitNoteReasonRemarks` columns; `PostInvoiceRequest` doesn't carry them; `BuildFbrRequestFromEntity` doesn't include them in the FBR payload.

> **Frontend dependency:** Frontend Implementation Plan v1.1 Phase 4.4 renders `debitNoteReason` + `debitNoteReasonRemarks` form inputs. Until B2 lands, every debit-note submission from the new UI will fail at FBR. Land B2 **before** frontend Phase 4.4 (Days 10–15) starts, or accept a window of broken debit notes.

**Fix.**
1. Add columns: `Invoice.DebitNoteReason` (string?), `Invoice.DebitNoteReasonRemarks` (string?)
2. Add fields to `PostInvoiceRequest` DTO + `FbrInvoiceRequest`
3. Map in `MapRequestToInvoice` and both `BuildFbrRequest` methods
4. Add to `PostInvoiceRequestValidator` — required when `InvoiceType` ∈ `{Debit Note, Credit Note}`; remarks required when `Reason = "Others"`
5. New compliance rule `FBR_REASON_001` in `compliance-rules.json` (so it can be edited without rebuild)

**Files touched.**
- `Domain/Entities/Invoice.cs`
- `Application/DTOs/Invoices/InvoiceDtos.cs`
- `Application/Common/FbrInvoiceRequest.cs`
- `Application/Validators/Invoices/PostInvoiceRequestValidator.cs`
- `Infrastructure/Services/InvoiceService.cs` (mapping)
- `Infrastructure/Persistence/Configurations/InvoiceConfiguration.cs`
- `Infrastructure/Compliance/compliance-rules.json`
- New migration `AddDebitNoteReasonFields`

**Verification.** Submit Debit Note without reason → 422 with code `COMPLIANCE_FAILED`. With reason="Others" but no remarks → 422. With both → FBR sandbox accepts.

---

### B3 — JWT signing key + CORS hardening   `~0.5 days`

**Problem (security).**
1. `appsettings.json:JwtSettings:SecretKey` is the literal string `"CHANGE_THIS_TO_A_CRYPTOGRAPHICALLY_SECURE_KEY_MIN_256_BITS_NEVER_COMMIT"`. Any deployment using this is fully compromised.
2. `Cors:AllowedOrigins` is `[]` in `appsettings.json`. The CORS policy explicitly comments `"Development fallback — never for production"` but the empty-array branch executes regardless of environment, granting `AllowAnyOrigin`.

**Fix.**
1. Generate a 256-bit random key, store in environment variable / user secrets / Azure Key Vault — not in source. Update deployment docs.
2. In `ServiceCollectionExtensions.AddCors`, guard the `AllowAnyOrigin` branch with `IHostEnvironment.IsDevelopment()` only, and **throw at startup** if production has empty `AllowedOrigins`:
```csharp
if (origins.Length == 0 && !env.IsDevelopment())
    throw new InvalidOperationException("Cors:AllowedOrigins must be configured in non-Dev environments.");
```
3. Production-config note: also rotate `FbrApi:BearerToken` placeholder to environment variable, even though per-tenant tokens supersede it.

**Files touched.**
- `API/Extensions/ServiceCollectionExtensions.cs` (CORS guard)
- `appsettings.json` (annotate placeholders, leave values unchanged so anyone running locally fails loudly)
- New `DEPLOYMENT.md` (separate doc — list of secrets that must be set)

**Verification.** Start API in non-Development with empty CORS → startup fails. Start with valid origins → CORS rejects requests from other origins.

---

### B4 — InvoiceRefNo length validation   `~0.25 days`

**Problem.** FBR requires `InvoiceRefNo` to be exactly **22 digits** (NTN seller) or **28 digits** (CNIC seller). Today only `compliance-rules.json:FBR_REF_002` enforces 22 or 28 (any digits). Need stricter "digits-only + matches seller type" rule.

**Fix.**
1. Tighten `FBR_REF_002` to also require all-digits
2. Add `FBR_REF_003` — if `SellerNtnCnic.Length == 7` then `InvoiceRefNo.Length == 22`; if `SellerNtnCnic.Length == 13` then `InvoiceRefNo.Length == 28`

**Files touched.**
- `Infrastructure/Compliance/compliance-rules.json`

**Verification.** Submit Debit Note with wrong-length IRN → 422 before reaching FBR.

---

## 🟡 High priority (do shortly after go-live)

### H1 — Manual retry endpoint for Failed invoices   `~0.5 days`

**Why.** Operators have no escape path for `Failed` invoices today — the 15-min Hangfire job only reprocesses `Pending`.

**Fix.** Add `POST /api/v1/di/{id}/retry`:
- Validates `Status == Failed`
- Caps at 10 attempts (returns 422 if exceeded)
- Resets `Status = Pending`, increments `SubmissionAttempts`
- Enqueues `IInvoiceService.SubmitToFbrAsync` on Hangfire `critical` queue

**Files touched.**
- `Application/Services/IInvoiceService.cs` (add `RetryAsync`)
- `Infrastructure/Services/InvoiceService.cs`
- `API/Controllers/v1/InvoicesController.cs`

---

### H2 — Excel upload status endpoint   `~0.5 days`

**Why.** Frontend needs to poll the result of a bulk upload. Currently no `GET /di/upload-excel/{jobId}` exists; the only signal is "all `Pending` invoices for this tenant".

**Fix.** Add `GET /api/v1/di/upload-excel/{jobId}` returning the `ExcelUploadJob` with per-row results and aggregate counts (`Total`, `Succeeded`, `Failed`).

**Files touched.**
- `Application/Services/IExcelUploadService.cs`
- `Infrastructure/Services/ExcelUploadService.cs`
- `API/Controllers/v1/InvoicesController.cs`

---

### H3 — Webhook HMAC signature + test-fire endpoint   `~1 day`

**Why.** Receivers can't verify a webhook came from us. No way for an admin to test the configuration end-to-end without posting a real invoice.

**Fix.**
1. Add `Webhook:SecretKey` in `TenantSettings` (encrypted)
2. `WebhookService` signs body with HMAC-SHA256, sends header `X-ZarnTaxSync-Signature: sha256=<hex>` and `X-ZarnTaxSync-Event: <eventName>`
3. Document signature verification recipe in *Frontend / Integration Guide*
4. Add `POST /api/v1/tenants/{id}/webhook/test` — fires a synthetic `WebhookTest` payload to the configured URL

**Files touched.**
- `Infrastructure/Services/WebhookService.cs`
- New endpoint on `TenantsController`

---

### H4 — Document Type & Transaction Type reference data   `~1 day`

**Why.** FBR DI API V1.12 lists `/pdi/v1/doctypecode` and `/pdi/v1/transtypecode` as part of the reference set. The Rates endpoint already needs `transTypeId` — without a synced lookup the frontend has to ask the user to type a number.

**Fix.**
1. Add entities `RefDocumentType`, `RefTransactionType`
2. Add `DbSet`s + EF configurations
3. Migration `AddDocAndTransactionTypes`
4. Extend `ReferenceDataSyncJob` to populate both
5. Add `GET /reference/document-types` and `GET /reference/transaction-types`

**Files touched.**
- `Domain/Entities/`
- `Infrastructure/Persistence/`
- `Infrastructure/BackgroundJobs/ReferenceDataSyncJob.cs`
- `API/Controllers/v1/ReferenceDataController.cs`

---

### H5 — Deferred submission queue with exponential backoff   `~2 days`

**Why.** Today, FBR HTTP errors throw and rely on Hangfire's built-in retry (10 attempts, fixed). For prolonged FBR outages this masks the true state. The `Deferred` invoice status is already exposed in `DashboardReportDto` but never set.

**Fix.**
1. Add `InvoiceStatus.Deferred = 5`
2. New entity `DeferredSubmission` (`Id`, `InvoiceId`, `TenantId`, `AttemptCount`, `NextRetryAt`, `LastError`, `CreatedAt`)
3. In `InvoiceService.SubmitToFbrAsync`, on transient errors (HTTP 5xx, timeout, broken circuit) — create a `DeferredSubmission` instead of `MarkAsFailed`, set `Status = Deferred`
4. New `DeferredSubmissionProcessor` Hangfire job (every 1 min): pick up due rows, retry, on success delete and mark `Submitted`; on failure update `NextRetryAt` per backoff schedule (1m → 5m → 15m → 1h → 4h → mark Failed after 5 attempts)
5. Migration `AddDeferredSubmissionTable`

**Files touched.**
- `Domain/Enums/InvoiceStatus.cs`
- `Domain/Entities/DeferredSubmission.cs`
- `Infrastructure/Services/InvoiceService.cs`
- `Infrastructure/BackgroundJobs/DeferredSubmissionProcessor.cs`
- Migration

---

### H6 — Tenant `BusinessActivity` + `Sector` fields   `~0.5 days + migration`

**Why (promoted from N4).** FBR DI API V1.12 §10 ("Applicable Scenarios based on Business Activity") maps each combination of business activity (Manufacturer / Importer / Distributor / Wholesaler / Exporter / Retailer / Service Provider / Other) × sector (Steel / FMCG / Textile / Telecom / Petroleum / Electricity Distribution / Gas Distribution / Services / Automobile / CNG Stations / Pharmaceuticals / Wholesale-Retails / All Other Sectors) to a *different subset* of the 28 sandbox scenarios. Without these fields:
1. Frontend Phase 2 (tenant onboarding) cannot surface a Business Activity dropdown.
2. Frontend Phase 3 (scenarios) cannot filter the 28-row table — non-retailer tenants will see SN026/SN027/SN028 (retailer-only) and run them, polluting certification.
3. B1 scenario payload builder cannot guard retailer-only scenarios as that fix requires.

**Fix.**
1. Add enum `BusinessActivity` (Manufacturer / Importer / Distributor / Wholesaler / Exporter / Retailer / ServiceProvider / Other) in `Domain/Enums/`.
2. Add enum `BusinessSector` (AllOtherSectors / Steel / FMCG / Textile / Telecom / Petroleum / ElectricityDistribution / GasDistribution / Services / Automobile / CngStations / Pharmaceuticals / WholesaleRetails) in `Domain/Enums/`.
3. Add nullable columns `Tenant.BusinessActivity`, `Tenant.Sector` (nullable so existing tenants don't break; UI prompts on first login).
4. Extend `CreateTenantRequest`, `UpdateTenantRequest`, `TenantResponse` DTOs with both fields.
5. Migration `AddTenantBusinessActivityAndSector`.
6. Wire into B1 scenario gating — `BuildScenarioPayload` rejects scenarios not applicable to tenant's activity/sector with a clear `BusinessRuleException("Scenario {n} is not applicable to {activity}/{sector}")`.

**Files touched.**
- `Domain/Enums/BusinessActivity.cs`, `BusinessSector.cs`
- `Domain/Entities/Tenant.cs`
- `Application/DTOs/Tenants/TenantDtos.cs`
- `Application/Validators/Tenants/CreateTenantRequestValidator.cs`, `UpdateTenantRequestValidator.cs`
- `Infrastructure/Persistence/Configurations/TenantConfiguration.cs`
- `Infrastructure/Services/ScenarioTestService.cs` (gating in `BuildScenarioPayload`)
- New migration `AddTenantBusinessActivityAndSector`

**Verification.** Create tenant with activity=Retailer, sector=AllOtherSectors → SN026/SN027/SN028 are now applicable. Create tenant with activity=Manufacturer, sector=Steel → only SN003/SN004/SN011 are applicable. Attempting to run a non-applicable scenario returns 422 with a clear message.

---

## ❓ Open scope decision

### S1 — Credit Note support (`InvoiceType.CreditNote = 3`)   `~1 day if greenlit`

**Question.** The codebase ships `InvoiceType` enum with only `SaleInvoice = 1` and `DebitNote = 2`. The Frontend Implementation Guide §7.4 lists `"Sale Invoice" | "Debit Note" | "Credit Note"` in `PostInvoiceRequest` (incorrect — Credit Note is not implemented anywhere in the backend). FBR error codes (0027, 0033, 0036, 0037 etc.) reference credit-note semantics, so the FBR API itself accepts credit notes.

**Decision needed.** Is Credit Note in scope for v1?

**If yes (~1 day):**
1. Add `CreditNote = 3` to `Domain/Enums/InvoiceType.cs`.
2. Reuse `B2` Reason/ReasonRemarks for credit notes (same FBR errors 0030/0031).
3. Extend `ValidateDebitCreditNoteAsync` to also handle credit notes (date ≥ original, 180-day window, ST ≤ original — already named for both).
4. Add to `PostInvoiceRequestValidator` allowed `InvoiceType` values.
5. Add to `compliance-rules.json:FBR_DOCTYPE_001` allowed-set.
6. Add to `BuildFbrRequest*` mapping.
7. Frontend appends "Credit Note" to invoiceType select; Reason/Remarks already wired.

**If no:** Update Frontend Implementation Guide §7.4 to drop "Credit Note" from the union type so future devs aren't misled.

---

## 🟢 Nice-to-have (post go-live)

### N1 — `GET /auth/me` endpoint   `~0.25 days`
Frontend needs a way to refresh the current user's profile after login (e.g. role change). Today the only source is the `AuthResponse.User` returned at login.

### N2 — Password reset flow (email-based)   `~1.5 days`
`POST /auth/forgot-password` (sends time-limited token via SMTP), `POST /auth/reset-password`. Requires SMTP integration.

### N3 — FBR error code reference table   `~0.5 days`
Mirror the JSON `FbrErrorMapper` into a synced `ref_error_codes` table. Lets admins see the catalog and update without redeploy.

### N5 — Invoice export CSV/Excel   `~1 day`
`GET /di/export?status=&fromDate=&toDate=` — streams CSV. Common feature for finance teams.

### N6 — Health-checks for FBR API + Hangfire   `~0.5 days`
Add custom health checks: `Hangfire.AspNetCore` server health, FBR ping (cached 5 min). Currently `/health/ready` covers DB + Redis only.

### N7 — Docker / docker-compose   `~1 day`
Dockerfile for the API (multi-stage, distroless), docker-compose for local dev (API + PostgreSQL + Redis + pgAdmin). Useful for onboarding.

---

## Sequencing

```
   ----- Decision gate: S1 (Credit Note in scope?) — answer before Day 1 -----

Day 1 (Morning):    B3 — secrets + CORS              (deployment unblocker)
Day 1 (Afternoon):  B2 — Debit note reason fields    (BLOCKS frontend Phase 4.4)
Day 1 (End):        B4 — IRN length tightening
Day 2 (Morning):    H6 — Tenant.BusinessActivity + Sector  (BLOCKS frontend Phase 2 + 3)
Day 2 (Afternoon):  B1 start — 28 scenario payloads
Day 3:              B1 finish + verify with PRAL sandbox (uses H6 gating)
   ----- Submit certification request to PRAL -----
   ----- Wait 1–2 weeks for Production Token -----
Day 4:              H1 — retry endpoint + H2 — Excel status
Day 5:              H4 — Doc/Transaction Types + start H3
Day 6:              H3 — Webhooks finish
Day 7–8:            H5 — Deferred queue
   (If S1 = yes) Day 8.5: implement Credit Note enum value + tests
   ----- Production Token received → enable Production env on tenant -----
   ----- Run 1 live test invoice -----
Day 9+:             N1–N7 as priority allows
```

> **Why H6 jumped tiers:** Frontend Implementation Plan v1.1 makes H6 a hard dependency for Phase 2 (tenant Overview tab dropdown) and Phase 3 (scenario filtering). Without it, frontend work either blocks at Day 4 of frontend execution or ships a UI that misleads operators about which scenarios apply to them. Cost-of-delay favours doing it on Day 2.

> **Why B2 jumped earlier in the day:** Same reason — frontend Phase 4.4 renders Reason/Remarks inputs unconditionally and submits them. Until B2 lands, the new UI's debit-note submissions break.

---

## Critical files to keep an eye on

These touch most features — review carefully on every PR:

| File | Why |
|---|---|
| `Infrastructure/Services/InvoiceService.cs` | The hub — ~930 lines, mutated by almost every backend feature change |
| `Infrastructure/Persistence/ApplicationDbContext.cs` | Every new entity adds a `DbSet` + filter |
| `API/Controllers/v1/InvoicesController.cs` | Gains submission-logs, pdf, retry, excel-status endpoints |
| `Infrastructure/DependencyInjection.cs` | Every new service or job needs registration |
| `Infrastructure/Compliance/compliance-rules.json` | Hot-swappable — easy to break invoice posting if a rule has a typo |
| `Infrastructure/Integration/Fbr/fbr-error-codes.json` | User-visible error messages — review wording with business |
| `API/Program.cs` | Hangfire job schedule + QuestPDF license + DataProtection |

---

## Architectural decisions (do not revisit)

- **No CQRS / MediatR** — service classes only (matches user preference and existing pattern)
- **QuestPDF Community license** — already wired (`QuestPDF.Settings.License = LicenseType.Community`)
- **DataProtection for token encryption** — ASP.NET Core built-in, no extra package
- **Compliance rules in JSON, not code** — DynamicExpresso evaluates expressions; rules are hot-editable
- **Per-tenant FBR token via DelegatingHandler** — single point of injection, Redis-cached 30 min
- **Refit for FBR** — generated client, no hand-rolled HttpClient code
- **Polly retry + circuit breaker** — wraps every FBR call
- **Hangfire on PostgreSQL** — single storage for both app and jobs

---

## What this plan does NOT include

- **Frontend** — see `Frontend Implementation Guide.md`
- **DevOps / CI / CD pipeline** — out of scope for this document
- **Test coverage** — `tests/UnitTests` and `tests/IntegrationTests` projects exist but are scaffolds; should be filled in post go-live
- **POS terminal hierarchy** — explicitly deferred; current Branch model is sufficient
- **Multi-database / DB-per-tenant migration** — `Tenant.ConnectionString` field reserved for future, no work planned now

---

*For a feature-by-feature backend reference, see **Updated Technical Reference — Developers.md**.*
*For business-level state, see **Updated Functional Guide — Project Managers & Users.md**.*
