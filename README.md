# ZarnTaxSync — Frontend

B2B FBR Digital Invoicing compliance platform. React 18 + TypeScript SPA built
to talk to the .NET Core 10 backend.

## Stack

| Concern | Library |
|---|---|
| Build | Vite 5 |
| Framework | React 18 + TypeScript (strict) |
| Routing | TanStack Router v1 (file-based) |
| Server state | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Forms | react-hook-form + Zod |
| HTTP | axios (envelope unwrap, 401 refresh-replay) |
| Local state | zustand |
| UI | shadcn/ui + Radix + Tailwind CSS |
| Toasts | sonner |
| Charts | recharts |
| Dates | date-fns |
| Icons | lucide-react |

## Prerequisites

- Node 20+ (tested on 22.x)
- pnpm 10+ (`npm install -g pnpm`)

## Getting started

```sh
# 1. Install
pnpm install

# 2. Configure env (copy and edit)
cp .env.example .env

# 3. Run dev server
pnpm dev
# → http://localhost:5173
```

The TanStack Router Vite plugin generates `src/routeTree.gen.ts` automatically
on first run. If TypeScript complains about route types before the first
`pnpm dev`, just start the dev server once and they'll resolve.

## Environment variables

See `.env.example` for the full list. All vars are validated at boot via
`src/lib/env.ts` — invalid values fail loudly rather than producing confusing
runtime errors.

| Var | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://localhost:5000/api/v1` | Backend base URL incl. `/api/v1` |
| `VITE_DEFAULT_NAV_LAYOUT` | `sidebar` | `sidebar` or `topbar` — user can override |
| `VITE_APP_NAME` | `ZarnTaxSync` | Brand wordmark |

## Implementation phases

| Phase | Status | Notes |
|---|---|---|
| 0 — Scaffold | ✅ | Vite, deps, tailwind, shadcn primitives, env |
| 1 — Auth + Shell | ✅ | Login, refresh-replay, protected layout, theme + nav-layout switch, RequireRole, DataTable |
| 2 — Tenant onboarding | ✅ | List, create, detail (Overview/Settings/FBR Token/Users tabs), token form, env switch |
| 3 — Scenarios | ✅ | List, run, certify, scenarioMatrix-driven filtering, B1 warning |
| 4 — Operator flow | ✅ | Dashboard (KPIs + last-7-days chart), invoice list/detail/new (with idempotency key + pre-flight validate + Debit Note Reason/Remarks), Excel upload, IRN lookup, PDF download (Bearer-authed Blob), submission logs accordion |
| 5 — Admin + integration | ✅ | Users (CRUD + role change + lockout/unlock), branches (incl. head-office guard), API keys (one-time copy modal), integration guide page with cURL sample |
| 6 — Polish | ✅ | Audit logs (with side-by-side JSON diff), reports (compliance + failed invoices), products (CRUD + CSV import), change password, sandbox-environment banner |
| Guest login | ⚠️ | Temporary "Continue as guest" entry on the login page — flagged with `// TODO(guest-login)` for easy removal once the real backend session is wired up |

### Theme + Navigation layout

- Theme: `system | light | dark` — toggle in TopBar, persisted in `localStorage`,
  applied pre-paint via inline script in `index.html` to avoid FOUC.
- Nav layout: `sidebar | topbar` — toggle in TopBar (icon next to theme).
  Default comes from `VITE_DEFAULT_NAV_LAYOUT`; user override persisted.

### Backend gap N4 (BusinessType)

Tenant `businessActivity` and `sector` aren't yet on the backend DTO. They are
persisted locally in `useTenantProfileStore` (`localStorage`) and consumed by
the Phase 3 scenario filter. When backend N4 ships, replace this store with
the real tenant fields. See banner on the Tenant Overview tab.

## Folder structure

```
src/
├── api/          axios client, types, per-controller endpoints
├── components/
│   ├── common/   ThemeProvider, RequireRole, DataTable, Logo, ...
│   ├── layout/   AppShell, Sidebar, TopBar, navigation config
│   ├── scenarios/, tenant/, ui/  (shadcn primitives)
├── hooks/        TanStack Query wrappers per domain
├── lib/          env, format, scenarioMatrix, utils
├── routes/       file-based TanStack Router routes
├── stores/       zustand: auth, preferences, tenantProfile (N4 stand-in)
├── main.tsx
└── index.css     tailwind layers + shadcn CSS variables
```

## Critical type fixes (per API_ENDPOINTS.md v2.0)

These are honored everywhere in `src/api/types.ts` and the invoice form (Phase 4):

- `invoiceType`: `"SaleInvoice"` / `"DebitNote"` (no spaces, PascalCase)
- `scenarioId`: integer
- `rate`: number (display as `"18%"` only)
- `pageNumber` (not `page`) on `PaginationMeta`
