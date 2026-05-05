/**
 * Concrete guest-mode handlers, registered with the mock router.
 *
 * TODO(guest-login): delete this file along with the rest of `mock/` when the
 * backend takes over for real.
 *
 * Side-effect import in `client.ts` ensures these run at boot.
 */
import { mock } from "@/api/mock";
import {
  apiKeys,
  auditLogs,
  branches,
  customers,
  errorLogs,
  fixtures,
  invoices,
  products,
  scenarios,
  tenantSettings,
  tenants,
  users,
} from "@/api/mock/fixtures";
import type {
  ApiKey,
  AppUser,
  AuditLogEntry,
  AuthResponse,
  Branch,
  Customer,
  DashboardKpis,
  ErrorLogEntry,
  IntegrationStatus,
  Invoice,
  InvoiceItem,
  PaginationMeta,
  Product,
  ReportSummary,
  SalesByTaxRate,
  SalesPoint,
  Scenario,
  ScenarioSummary,
  SyncStatus,
  Tenant,
  TenantSetting,
  TokenStatus,
} from "@/api/types";

// ----------------------------- Helpers ---------------------------------------

function paginate<T>(
  items: T[],
  pageNumber: number,
  pageSize: number,
): { items: T[]; pagination: PaginationMeta } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (pageNumber - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      pageNumber,
      pageSize,
      totalCount,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
    },
  };
}

function readPaging(query: URLSearchParams) {
  const pageNumber = Number(query.get("pageNumber") ?? "1") || 1;
  const pageSize = Number(query.get("pageSize") ?? "10") || 10;
  const search = (query.get("search") ?? "").toLowerCase().trim();
  return { pageNumber, pageSize, search };
}

function search<T extends object>(
  items: T[],
  q: string,
  fields: Array<keyof T>,
): T[] {
  if (!q) return items;
  return items.filter((it) =>
    fields.some((f) =>
      String((it as Record<string, unknown>)[String(f)] ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
}

// ----------------------------- Auth ------------------------------------------

mock<AuthResponse>("POST", "/auth/login", () => {
  // Guest mode shouldn't really call /auth/login, but we provide a stub so
  // that programmatic callers don't blow up.
  throw new Error(
    "Guest mode: real /auth/login is disabled. Use the 'Continue as guest' button.",
  );
});

mock<null>("POST", "/auth/refresh-token", () => ({ data: null }));
mock<null>("POST", "/auth/revoke-token", () => ({ data: null }));
mock<null>("POST", "/auth/change-password", () => ({ data: null }));

// ----------------------------- Tenants (Phase 2) -----------------------------

mock<Tenant[]>("GET", "/tenants", ({ query }) => {
  const { pageNumber, pageSize, search: q } = readPaging(query);
  const filtered = search(tenants, q, ["name", "subdomain", "ntnCnic"]);
  const page = paginate(filtered, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

mock<Tenant>("GET", "/tenants/:id", ({ pathParams }) => {
  const t = tenants.find((x) => x.id === pathParams.id);
  if (!t) throw new Error(`Tenant ${pathParams.id} not found`);
  return { data: t };
});

mock<Tenant>("POST", "/tenants", ({ body }) => {
  const b = body as { name: string; subdomain: string; ntnCnic: string; planType: Tenant["planType"] };
  const t: Tenant = {
    id: fixtures.uuid(),
    name: b.name,
    subdomain: b.subdomain,
    ntnCnic: b.ntnCnic,
    planType: b.planType,
    isActive: true,
    branchCount: 0,
    userCount: 0,
    createdAt: new Date().toISOString(),
  };
  tenants.unshift(t);
  return { data: t, status: 201 };
});

mock<{
  tenantId: string;
  headOfficeBranchId: string;
  tenantAdminUserId: string;
}>("POST", "/tenants/onboard", ({ body }) => {
  const b = body as {
    name: string;
    subdomain: string;
    ntnCnic: string;
    planType: Tenant["planType"];
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
  };

  const tenantId = fixtures.uuid();
  const branchId = fixtures.uuid();
  const userId = fixtures.uuid();

  const tenant: Tenant = {
    id: tenantId,
    name: b.name,
    subdomain: b.subdomain,
    ntnCnic: b.ntnCnic,
    planType: b.planType,
    isActive: true,
    branchCount: 1,
    userCount: 1,
    createdAt: new Date().toISOString(),
  };
  tenants.unshift(tenant);

  branches.unshift({
    id: branchId,
    code: "HO",
    name: "Head Office",
    address: "",
    province: undefined,
    isActive: true,
    userCount: 1,
    createdAt: new Date().toISOString(),
  });

  users.unshift({
    id: userId,
    firstName: b.adminFirstName,
    lastName: b.adminLastName,
    fullName: `${b.adminFirstName} ${b.adminLastName}`,
    email: b.adminEmail,
    role: "TenantAdmin",
    branchId,
    branchName: "Head Office",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  });

  return {
    data: {
      tenantId,
      headOfficeBranchId: branchId,
      tenantAdminUserId: userId,
    },
    status: 201,
  };
});

mock<Tenant>("PUT", "/tenants/:id", ({ pathParams, body }) => {
  const t = tenants.find((x) => x.id === pathParams.id);
  if (!t) throw new Error(`Tenant ${pathParams.id} not found`);
  Object.assign(t, body);
  return { data: t };
});

mock<null>("POST", "/tenants/:id/activate", ({ pathParams }) => {
  const t = tenants.find((x) => x.id === pathParams.id);
  if (t) t.isActive = true;
  return { data: null };
});

mock<null>("POST", "/tenants/:id/deactivate", ({ pathParams }) => {
  const t = tenants.find((x) => x.id === pathParams.id);
  if (t) t.isActive = false;
  return { data: null };
});

mock<TenantSetting[]>("GET", "/tenants/:id/settings", ({ pathParams }) => ({
  data: tenantSettings[pathParams.id] ?? [],
}));

mock<TenantSetting>("PUT", "/tenants/:id/settings", ({ pathParams, body }) => {
  const list = tenantSettings[pathParams.id] ?? (tenantSettings[pathParams.id] = []);
  const incoming = body as TenantSetting;
  const idx = list.findIndex((s) => s.key === incoming.key);
  if (idx >= 0) list[idx] = incoming;
  else list.push(incoming);
  return { data: incoming };
});

mock<null>("PUT", "/tenants/:id/token/sandbox", () => ({ data: null }));
mock<null>("PUT", "/tenants/:id/token/production", () => ({ data: null }));
mock<null>("PUT", "/tenants/:id/environment", () => ({ data: null }));

mock<TokenStatus>("GET", "/tenants/:id/token-status", () => ({
  data: {
    environment: "Sandbox",
    expiresAt: fixtures.isoDaysAgo(-180),
    daysRemaining: 180,
  },
}));

// ----------------------------- Scenarios (Phase 3) ---------------------------

mock<Scenario[]>("GET", "/di/scenarios", () => ({ data: scenarios }));

mock<Scenario>("POST", "/di/scenarios/:n/run", ({ pathParams }) => {
  const n = Number(pathParams.n);
  const s = scenarios.find((x) => x.scenarioNumber === n);
  if (!s) throw new Error("Scenario not found");
  s.status = Math.random() > 0.3 ? "Passed" : "Failed";
  s.runAt = new Date().toISOString();
  s.fbrResponse = s.status === "Failed" ? "FBR sandbox returned schema error." : "OK";
  return { data: { ...s } };
});

mock<null>("PUT", "/di/scenarios/:n/certify", ({ pathParams }) => {
  const n = Number(pathParams.n);
  const s = scenarios.find((x) => x.scenarioNumber === n);
  if (s) s.certifiedAt = new Date().toISOString();
  return { data: null };
});

mock<ScenarioSummary>("GET", "/di/scenarios/summary", () => {
  const total = scenarios.length;
  const passed = scenarios.filter((s) => s.status === "Passed").length;
  const failed = scenarios.filter((s) => s.status === "Failed").length;
  const pending = scenarios.filter((s) => s.status === "Pending").length;
  return {
    data: {
      total,
      passed,
      failed,
      pending,
      progressPercent: Math.round((passed / total) * 100),
    },
  };
});

// ----------------------------- Dashboard (Phase 4) ---------------------------

mock<DashboardKpis>("GET", "/dashboard/kpis", () => {
  const submitted = invoices.filter((i) => i.status === "Submitted");
  const totalSales = submitted.reduce((s, i) => s + i.totalAmount, 0);
  const taxCollected = submitted.reduce((s, i) => s + i.taxAmount, 0);
  return {
    data: {
      totalSales: 2_450_000,
      totalSalesDelta: 12.5,
      taxCollected: 367_500,
      taxCollectedDelta: 8.3,
      pendingSyncCount: invoices.filter((i) => i.status === "Pending").length,
      errorCount: errorLogs.length,
      // Defensive: also expose the live computed values for tooling.
      _liveTotalSales: totalSales,
      _liveTaxCollected: taxCollected,
    } as DashboardKpis,
  };
});

mock<SalesPoint[]>("GET", "/dashboard/sales-overview", ({ query }) => {
  const days = Number(query.get("days") ?? "7");
  const out: SalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = 120_000 + Math.sin(i * 0.7) * 60_000 + (i % 3) * 12_000;
    out.push({
      date: d.toISOString().slice(0, 10),
      amount: Math.round(base + 30_000 * Math.random()),
    });
  }
  return { data: out };
});

mock<SalesByTaxRate[]>("GET", "/dashboard/sales-by-tax-rate", () => ({
  data: [
    { rate: 16, amount: 180_000, share: 0.49 },
    { rate: 8, amount: 120_000, share: 0.33 },
    { rate: 0, amount: 67_500, share: 0.18 },
  ],
}));

mock<SyncStatus>("GET", "/dashboard/sync-status", () => ({
  data: {
    apiConnected: true,
    lastSyncAt: fixtures.isoMinutesAgo(2),
    failedInvoices: 3,
  },
}));

mock<ErrorLogEntry[]>("GET", "/dashboard/error-logs", () => ({ data: errorLogs }));

mock<Invoice[]>("GET", "/dashboard/recent-invoices", () => {
  const sorted = [...invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return { data: sorted.slice(0, 5) };
});

// ----------------------------- Invoices (Phase 4) ---------------------------

function invoiceMatches(i: Invoice, q: string) {
  if (!q) return true;
  return (
    i.invoiceNumber.toLowerCase().includes(q) ||
    i.customerName.toLowerCase().includes(q) ||
    (i.customerNtnCnic ?? "").includes(q)
  );
}

mock<Invoice[]>("GET", "/invoices", ({ query }) => {
  const { pageNumber, pageSize, search: q } = readPaging(query);
  const status = query.get("status");
  const type = query.get("invoiceType");
  let filtered = invoices.filter((i) => invoiceMatches(i, q));
  if (status) filtered = filtered.filter((i) => i.status === status);
  if (type) filtered = filtered.filter((i) => i.invoiceType === type);
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const page = paginate(sorted, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

mock<Invoice>("GET", "/invoices/:id", ({ pathParams }) => {
  const inv = invoices.find((i) => i.id === pathParams.id);
  if (!inv) throw new Error("Invoice not found");
  return { data: inv };
});

function recomputeInvoiceTotals(items: InvoiceItem[]) {
  const enriched = items.map((it) => {
    const lineSubtotal = it.unitPrice * it.quantity;
    const taxAmount = lineSubtotal * (it.taxRate / 100);
    return {
      ...it,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round((lineSubtotal + taxAmount) * 100) / 100,
    };
  });
  const subtotal = enriched.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const taxAmount = enriched.reduce((s, it) => s + it.taxAmount, 0);
  return {
    items: enriched,
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}

mock<Invoice>("POST", "/invoices", ({ body }) => {
  const b = body as {
    invoiceType: Invoice["invoiceType"];
    customerId: string;
    invoiceDate: string;
    dueDate?: string;
    scenarioId?: number;
    items: InvoiceItem[];
  };
  const customer = customers.find((c) => c.id === b.customerId);
  if (!customer) throw new Error("Customer not found");
  const totals = recomputeInvoiceTotals(
    b.items.map((it) => ({
      ...it,
      id: fixtures.uuid(),
      taxAmount: 0,
      totalAmount: 0,
    })),
  );
  const inv: Invoice = {
    id: fixtures.uuid(),
    invoiceNumber: `INV-${1000 + invoices.length + 1}`,
    invoiceType: b.invoiceType,
    status: "Draft",
    customerId: customer.id,
    customerName: customer.name,
    customerNtnCnic: customer.ntnCnic,
    customerAddress: customer.address,
    customerProvince: customer.province,
    invoiceDate: b.invoiceDate,
    dueDate: b.dueDate,
    scenarioId: b.scenarioId,
    items: totals.items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    irn: null,
    fbrSubmittedAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoices.unshift(inv);
  return { data: inv, status: 201 };
});

mock<Invoice>("PUT", "/invoices/:id", ({ pathParams, body }) => {
  const inv = invoices.find((i) => i.id === pathParams.id);
  if (!inv) throw new Error("Invoice not found");
  const b = body as Partial<Invoice>;
  Object.assign(inv, b);
  if (b.items) {
    const totals = recomputeInvoiceTotals(b.items);
    inv.items = totals.items;
    inv.subtotal = totals.subtotal;
    inv.taxAmount = totals.taxAmount;
    inv.totalAmount = totals.totalAmount;
  }
  inv.updatedAt = new Date().toISOString();
  return { data: inv };
});

mock<null>("DELETE", "/invoices/:id", ({ pathParams }) => {
  const idx = invoices.findIndex((i) => i.id === pathParams.id);
  if (idx >= 0) invoices.splice(idx, 1);
  return { data: null };
});

mock<Invoice>("POST", "/invoices/:id/submit", ({ pathParams }) => {
  const inv = invoices.find((i) => i.id === pathParams.id);
  if (!inv) throw new Error("Invoice not found");
  if (Math.random() < 0.85) {
    inv.status = "Submitted";
    inv.irn = `IRN-${fixtures.uuid().slice(0, 8).toUpperCase()}`;
    inv.fbrSubmittedAt = new Date().toISOString();
    inv.errorMessage = null;
  } else {
    inv.status = "Failed";
    inv.errorMessage = "FBR rejected: invalid HS code on line 1.";
  }
  inv.updatedAt = new Date().toISOString();
  return { data: inv };
});

mock<Invoice>("POST", "/invoices/:id/retry", ({ pathParams }) => {
  const inv = invoices.find((i) => i.id === pathParams.id);
  if (!inv) throw new Error("Invoice not found");
  inv.status = "Submitted";
  inv.irn = `IRN-${fixtures.uuid().slice(0, 8).toUpperCase()}`;
  inv.fbrSubmittedAt = new Date().toISOString();
  inv.errorMessage = null;
  inv.updatedAt = new Date().toISOString();
  return { data: inv };
});

mock("POST", "/invoices/upload", ({ body }) => {
  // body would be FormData in real life; for guest mode we just simulate a result
  void body;
  return {
    data: {
      totalRows: 24,
      successCount: 22,
      failureCount: 2,
      errors: [
        { row: 7, message: "Invalid HS Code format on line 7" },
        { row: 19, message: "Customer NTN missing on line 19" },
      ],
    },
    delayMs: 800,
  };
});

// ----------------------------- Customers (Phase 6) ---------------------------

mock<Customer[]>("GET", "/customers", ({ query }) => {
  const { pageNumber, pageSize, search: q } = readPaging(query);
  const filtered = customers.filter((c) =>
    !q
      ? true
      : c.name.toLowerCase().includes(q) ||
        c.ntnCnic.includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
  );
  const page = paginate(filtered, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

mock<Customer>("GET", "/customers/:id", ({ pathParams }) => {
  const c = customers.find((x) => x.id === pathParams.id);
  if (!c) throw new Error("Customer not found");
  return { data: c };
});

mock<Customer>("POST", "/customers", ({ body }) => {
  const b = body as Omit<Customer, "id" | "isActive" | "invoiceCount" | "totalSpend" | "createdAt">;
  const c: Customer = {
    id: fixtures.uuid(),
    isActive: true,
    invoiceCount: 0,
    totalSpend: 0,
    createdAt: new Date().toISOString(),
    ...b,
  };
  customers.unshift(c);
  return { data: c, status: 201 };
});

mock<Customer>("PUT", "/customers/:id", ({ pathParams, body }) => {
  const c = customers.find((x) => x.id === pathParams.id);
  if (!c) throw new Error("Customer not found");
  Object.assign(c, body);
  return { data: c };
});

mock<null>("DELETE", "/customers/:id", ({ pathParams }) => {
  const idx = customers.findIndex((x) => x.id === pathParams.id);
  if (idx >= 0) customers.splice(idx, 1);
  return { data: null };
});

// ----------------------------- Products (Phase 6) ---------------------------

mock<Product[]>("GET", "/products", ({ query }) => {
  const { pageNumber, pageSize, search: q } = readPaging(query);
  const filtered = products.filter((p) =>
    !q
      ? true
      : p.name.toLowerCase().includes(q) || p.hsCode.includes(q),
  );
  const page = paginate(filtered, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

mock<Product>("GET", "/products/:id", ({ pathParams }) => {
  const p = products.find((x) => x.id === pathParams.id);
  if (!p) throw new Error("Product not found");
  return { data: p };
});

mock<Product>("POST", "/products", ({ body }) => {
  const b = body as Omit<Product, "id" | "isActive" | "createdAt">;
  const p: Product = {
    id: fixtures.uuid(),
    isActive: true,
    createdAt: new Date().toISOString(),
    ...b,
  };
  products.unshift(p);
  return { data: p, status: 201 };
});

mock<Product>("PUT", "/products/:id", ({ pathParams, body }) => {
  const p = products.find((x) => x.id === pathParams.id);
  if (!p) throw new Error("Product not found");
  Object.assign(p, body);
  return { data: p };
});

mock<null>("DELETE", "/products/:id", ({ pathParams }) => {
  const idx = products.findIndex((x) => x.id === pathParams.id);
  if (idx >= 0) products.splice(idx, 1);
  return { data: null };
});

// ----------------------------- Users (Phase 5) -------------------------------

mock<AppUser[]>("GET", "/users", ({ query }) => {
  const { pageNumber, pageSize, search: q } = readPaging(query);
  const filtered = users.filter((u) =>
    !q
      ? true
      : u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
  );
  const page = paginate(filtered, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

mock<AppUser>("GET", "/users/:id", ({ pathParams }) => {
  const u = users.find((x) => x.id === pathParams.id);
  if (!u) throw new Error("User not found");
  return { data: u };
});

mock<AppUser>("POST", "/users", ({ body }) => {
  const b = body as {
    firstName: string;
    lastName: string;
    email: string;
    role: AppUser["role"];
    branchId?: string | null;
  };
  const branch = branches.find((br) => br.id === b.branchId);
  const u: AppUser = {
    id: fixtures.uuid(),
    firstName: b.firstName,
    lastName: b.lastName,
    fullName: `${b.firstName} ${b.lastName}`,
    email: b.email,
    role: b.role,
    branchId: b.branchId ?? null,
    branchName: branch?.name ?? null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  };
  users.unshift(u);
  return { data: u, status: 201 };
});

mock<AppUser>("PUT", "/users/:id", ({ pathParams, body }) => {
  const u = users.find((x) => x.id === pathParams.id);
  if (!u) throw new Error("User not found");
  Object.assign(u, body);
  if ((body as Partial<AppUser>).firstName || (body as Partial<AppUser>).lastName) {
    u.fullName = `${u.firstName} ${u.lastName}`;
  }
  return { data: u };
});

mock<null>("DELETE", "/users/:id", ({ pathParams }) => {
  const idx = users.findIndex((x) => x.id === pathParams.id);
  if (idx >= 0) users.splice(idx, 1);
  return { data: null };
});

// ----------------------------- Branches (Phase 5) ----------------------------

mock<Branch[]>("GET", "/branches", ({ query }) => {
  const { pageNumber, pageSize, search: q } = readPaging(query);
  const filtered = branches.filter((b) =>
    !q ? true : b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
  );
  const page = paginate(filtered, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

mock<Branch>("POST", "/branches", ({ body }) => {
  const b = body as Omit<Branch, "id" | "isActive" | "userCount" | "createdAt">;
  const br: Branch = {
    id: fixtures.uuid(),
    isActive: true,
    userCount: 0,
    createdAt: new Date().toISOString(),
    ...b,
  };
  branches.unshift(br);
  return { data: br, status: 201 };
});

mock<Branch>("PUT", "/branches/:id", ({ pathParams, body }) => {
  const br = branches.find((x) => x.id === pathParams.id);
  if (!br) throw new Error("Branch not found");
  Object.assign(br, body);
  return { data: br };
});

mock<null>("DELETE", "/branches/:id", ({ pathParams }) => {
  const idx = branches.findIndex((x) => x.id === pathParams.id);
  if (idx >= 0) branches.splice(idx, 1);
  return { data: null };
});

// ----------------------------- API Keys (Phase 5) ----------------------------

mock<ApiKey[]>("GET", "/api-keys", () => ({ data: apiKeys }));

mock<ApiKey>("POST", "/api-keys", ({ body }) => {
  const b = body as { name: string; scopes: string[]; expiresAt?: string };
  const prefix = `zts_live_${fixtures.uuid().slice(0, 4)}`;
  const fullKey = `${prefix}_${fixtures.uuid().replace(/-/g, "")}`;
  const k: ApiKey = {
    id: fixtures.uuid(),
    name: b.name,
    prefix,
    fullKey,
    scopes: b.scopes,
    lastUsedAt: null,
    expiresAt: b.expiresAt ?? null,
    createdAt: new Date().toISOString(),
  };
  apiKeys.unshift(k);
  return { data: k, status: 201 };
});

mock<null>("DELETE", "/api-keys/:id", ({ pathParams }) => {
  const idx = apiKeys.findIndex((x) => x.id === pathParams.id);
  if (idx >= 0) apiKeys.splice(idx, 1);
  return { data: null };
});

// ----------------------------- Integration (Phase 5) -------------------------

mock<IntegrationStatus>("GET", "/integration/status", () => ({
  data: {
    apiConnected: true,
    environment: "Production",
    lastSyncAt: fixtures.isoMinutesAgo(2),
    tokenExpiresAt: fixtures.isoDaysAgo(-180),
    daysRemaining: 180,
    pendingQueueSize: invoices.filter((i) => i.status === "Pending").length,
    failedQueueSize: invoices.filter((i) => i.status === "Failed").length,
  },
}));

mock<{ ok: boolean; latencyMs: number }>("POST", "/integration/test-connection", () => ({
  data: { ok: true, latencyMs: 142 + Math.round(Math.random() * 60) },
  delayMs: 600,
}));

mock<{ retried: number }>("POST", "/integration/retry-failed", () => {
  const failed = invoices.filter((i) => i.status === "Failed");
  failed.forEach((inv) => {
    inv.status = "Submitted";
    inv.irn = `IRN-${fixtures.uuid().slice(0, 8).toUpperCase()}`;
    inv.fbrSubmittedAt = new Date().toISOString();
    inv.errorMessage = null;
  });
  return { data: { retried: failed.length }, delayMs: 800 };
});

// ----------------------------- Audit logs (Phase 6) --------------------------

mock<AuditLogEntry[]>("GET", "/audit-logs", ({ query }) => {
  const { pageNumber, pageSize } = readPaging(query);
  const action = query.get("action");
  const userEmail = query.get("userEmail");
  let filtered = [...auditLogs];
  if (action) filtered = filtered.filter((l) => l.action === action);
  if (userEmail) filtered = filtered.filter((l) => l.userEmail === userEmail);
  const sorted = filtered.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
  const page = paginate(sorted, pageNumber, pageSize);
  return { data: page.items, pagination: page.pagination };
});

// ----------------------------- Reports (Phase 6) -----------------------------

mock<ReportSummary>("GET", "/reports/summary", () => {
  const submitted = invoices.filter((i) => i.status === "Submitted");
  const totalSales = submitted.reduce((s, i) => s + i.totalAmount, 0);
  const totalTax = submitted.reduce((s, i) => s + i.taxAmount, 0);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return {
    data: {
      totalSales: 2_450_000,
      totalTax: 367_500,
      syncedToFbrPercent: 98,
      totalInvoices: invoices.length,
      monthly: months.map((m, i) => ({
        month: m,
        sales: 320_000 + i * 25_000 + (i % 2) * 40_000,
        tax: 48_000 + i * 4_000,
      })),
      _liveTotalSales: totalSales,
      _liveTotalTax: totalTax,
    } as ReportSummary,
  };
});
