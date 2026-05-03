/**
 * In-memory fixture store for guest mode. Lives only in tab memory.
 *
 * TODO(guest-login): delete this entire `mock/` folder when the backend is the
 * single source of truth.
 */
import type {
  ApiKey,
  AppUser,
  AuditLogEntry,
  Branch,
  Customer,
  ErrorLogEntry,
  Invoice,
  InvoiceItem,
  Product,
  Scenario,
  Tenant,
  TenantSetting,
} from "@/api/types";

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function isoDaysAgo(days: number, hourOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + hourOffset, 30, 0, 0);
  return d.toISOString();
}

function isoMinutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

// ----------------------------- Tenants ---------------------------------------

export const tenants: Tenant[] = [
  {
    id: "guest-tenant",
    name: "Acme Pvt Ltd",
    subdomain: "acme",
    ntnCnic: "1234567",
    planType: "Professional",
    isActive: true,
    branchCount: 3,
    userCount: 12,
    createdAt: isoDaysAgo(120),
  },
  {
    id: "tenant-2",
    name: "Zenith Traders",
    subdomain: "zenith",
    ntnCnic: "7654321",
    planType: "Standard",
    isActive: true,
    branchCount: 1,
    userCount: 4,
    createdAt: isoDaysAgo(60),
  },
  {
    id: "tenant-3",
    name: "Horizon Foods",
    subdomain: "horizon",
    ntnCnic: "9988776",
    planType: "Enterprise",
    isActive: false,
    branchCount: 5,
    userCount: 22,
    createdAt: isoDaysAgo(220),
  },
];

export const tenantSettings: Record<string, TenantSetting[]> = {
  "guest-tenant": [
    {
      key: "DefaultInvoicePrefix",
      value: "INV",
      description: "Prefix used for auto-generated invoice numbers.",
      isEncrypted: false,
    },
    {
      key: "FbrCallbackUrl",
      value: "https://api.zarntaxsync.local/webhooks/fbr",
      description: "Endpoint FBR posts asynchronous results to.",
      isEncrypted: false,
    },
    {
      key: "FbrApiSecret",
      value: "encrypted-value",
      description: "PRAL API secret. Encrypted at rest.",
      isEncrypted: true,
    },
  ],
};

// ----------------------------- Customers -------------------------------------

const baseCustomers: Customer[] = [
  {
    id: "cust-1",
    name: "ABC Pvt. Ltd.",
    ntnCnic: "1234567",
    email: "ar@abc.com.pk",
    phone: "+92 300 1234567",
    address: "12 Industrial Area, Lahore",
    province: "Punjab",
    isActive: true,
    invoiceCount: 18,
    totalSpend: 1_240_000,
    createdAt: isoDaysAgo(90),
  },
  {
    id: "cust-2",
    name: "XYZ Corporation",
    ntnCnic: "7654321",
    email: "billing@xyz.com.pk",
    phone: "+92 311 7654321",
    address: "Block 5, Clifton, Karachi",
    province: "Sindh",
    isActive: true,
    invoiceCount: 12,
    totalSpend: 760_500,
    createdAt: isoDaysAgo(75),
  },
  {
    id: "cust-3",
    name: "The Traders",
    ntnCnic: "9988776",
    email: "accounts@thetraders.pk",
    phone: "+92 333 9988776",
    address: "Saddar, Rawalpindi",
    province: "Punjab",
    isActive: true,
    invoiceCount: 7,
    totalSpend: 305_000,
    createdAt: isoDaysAgo(40),
  },
  {
    id: "cust-4",
    name: "Global Solutions",
    ntnCnic: "5544332",
    email: "info@global.pk",
    phone: "+92 321 5544332",
    address: "Gulberg III, Lahore",
    province: "Punjab",
    isActive: true,
    invoiceCount: 9,
    totalSpend: 540_000,
    createdAt: isoDaysAgo(50),
  },
  {
    id: "cust-5",
    name: "Retail Mart",
    ntnCnic: "3322110",
    email: "ops@retailmart.pk",
    phone: "+92 345 3322110",
    address: "G-9 Markaz, Islamabad",
    province: "Islamabad",
    isActive: false,
    invoiceCount: 3,
    totalSpend: 90_500,
    createdAt: isoDaysAgo(180),
  },
];

export const customers: Customer[] = [...baseCustomers];

// ----------------------------- Products --------------------------------------

const baseProducts: Product[] = [
  {
    id: "prod-1",
    name: "Standard Widget",
    hsCode: "1234.5678",
    unitPrice: 5000,
    defaultTaxRate: 18,
    unitOfMeasure: "PCS",
    isActive: true,
    createdAt: isoDaysAgo(60),
  },
  {
    id: "prod-2",
    name: "Premium Gadget",
    hsCode: "3345.6789",
    unitPrice: 3000,
    defaultTaxRate: 16,
    unitOfMeasure: "PCS",
    isActive: true,
    createdAt: isoDaysAgo(40),
  },
  {
    id: "prod-3",
    name: "Service Hour",
    hsCode: "9988.7766",
    unitPrice: 2500,
    defaultTaxRate: 8,
    unitOfMeasure: "HR",
    isActive: true,
    createdAt: isoDaysAgo(30),
  },
  {
    id: "prod-4",
    name: "Bulk Pack (50)",
    hsCode: "1100.2200",
    unitPrice: 24_000,
    defaultTaxRate: 18,
    unitOfMeasure: "BOX",
    isActive: false,
    createdAt: isoDaysAgo(150),
  },
];

export const products: Product[] = [...baseProducts];

// ----------------------------- Branches --------------------------------------

const baseBranches: Branch[] = [
  {
    id: "br-1",
    name: "Head Office",
    code: "HO-LHR",
    address: "12 Industrial Area, Lahore",
    province: "Punjab",
    isActive: true,
    userCount: 6,
    createdAt: isoDaysAgo(120),
  },
  {
    id: "br-2",
    name: "Karachi Branch",
    code: "KHI-01",
    address: "Block 5, Clifton, Karachi",
    province: "Sindh",
    isActive: true,
    userCount: 4,
    createdAt: isoDaysAgo(90),
  },
  {
    id: "br-3",
    name: "Islamabad Branch",
    code: "ISB-01",
    address: "G-9 Markaz, Islamabad",
    province: "Islamabad",
    isActive: true,
    userCount: 2,
    createdAt: isoDaysAgo(50),
  },
];

export const branches: Branch[] = [...baseBranches];

// ----------------------------- Users -----------------------------------------

const baseUsers: AppUser[] = [
  {
    id: "u-1",
    firstName: "Muhammad",
    lastName: "Ali",
    fullName: "Muhammad Ali",
    email: "ali@acme.pk",
    role: "TenantAdmin",
    branchId: "br-1",
    branchName: "Head Office",
    isActive: true,
    lastLoginAt: isoMinutesAgo(15),
    createdAt: isoDaysAgo(120),
  },
  {
    id: "u-2",
    firstName: "Ayesha",
    lastName: "Khan",
    fullName: "Ayesha Khan",
    email: "ayesha@acme.pk",
    role: "BranchManager",
    branchId: "br-2",
    branchName: "Karachi Branch",
    isActive: true,
    lastLoginAt: isoMinutesAgo(180),
    createdAt: isoDaysAgo(90),
  },
  {
    id: "u-3",
    firstName: "Bilal",
    lastName: "Ahmed",
    fullName: "Bilal Ahmed",
    email: "bilal@acme.pk",
    role: "Operator",
    branchId: "br-1",
    branchName: "Head Office",
    isActive: true,
    lastLoginAt: isoDaysAgo(2),
    createdAt: isoDaysAgo(60),
  },
  {
    id: "u-4",
    firstName: "Sara",
    lastName: "Iqbal",
    fullName: "Sara Iqbal",
    email: "sara@acme.pk",
    role: "Operator",
    branchId: "br-3",
    branchName: "Islamabad Branch",
    isActive: true,
    lastLoginAt: isoDaysAgo(5),
    createdAt: isoDaysAgo(40),
  },
  {
    id: "u-5",
    firstName: "Noman",
    lastName: "Tariq",
    fullName: "Noman Tariq",
    email: "noman@acme.pk",
    role: "Viewer",
    branchId: "br-1",
    branchName: "Head Office",
    isActive: false,
    lastLoginAt: null,
    createdAt: isoDaysAgo(20),
  },
];

export const users: AppUser[] = [...baseUsers];

// ----------------------------- API Keys --------------------------------------

const baseApiKeys: ApiKey[] = [
  {
    id: "key-1",
    name: "ERP integration",
    prefix: "zts_live_a1b2",
    scopes: ["invoices:read", "invoices:write"],
    lastUsedAt: isoMinutesAgo(45),
    expiresAt: isoDaysAgo(-90),
    createdAt: isoDaysAgo(30),
  },
  {
    id: "key-2",
    name: "Reporting webhook",
    prefix: "zts_live_c4d5",
    scopes: ["reports:read"],
    lastUsedAt: isoDaysAgo(3),
    expiresAt: isoDaysAgo(-200),
    createdAt: isoDaysAgo(60),
  },
];

export const apiKeys: ApiKey[] = [...baseApiKeys];

// ----------------------------- Invoices --------------------------------------

function buildInvoiceItems(): InvoiceItem[] {
  return [
    {
      id: uuid(),
      itemName: "Standard Widget",
      hsCode: "1234.5678",
      quantity: 2,
      unitPrice: 5000,
      taxRate: 18,
      taxAmount: 1800,
      totalAmount: 11_800,
    },
    {
      id: uuid(),
      itemName: "Premium Gadget",
      hsCode: "3345.6789",
      quantity: 1,
      unitPrice: 3000,
      taxRate: 16,
      taxAmount: 480,
      totalAmount: 3480,
    },
  ];
}

function makeInvoice(
  numberSuffix: number,
  status: Invoice["status"],
  customer: Customer,
  daysAgo: number,
  amount: number,
): Invoice {
  const items = buildInvoiceItems();
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
  return {
    id: `inv-${numberSuffix}`,
    invoiceNumber: `INV-${1000 + numberSuffix}`,
    invoiceType: numberSuffix % 7 === 0 ? "DebitNote" : "SaleInvoice",
    status,
    customerId: customer.id,
    customerName: customer.name,
    customerNtnCnic: customer.ntnCnic,
    customerAddress: customer.address,
    customerProvince: customer.province,
    invoiceDate: isoDaysAgo(daysAgo),
    dueDate: isoDaysAgo(daysAgo - 30),
    subtotal,
    taxAmount,
    totalAmount: amount,
    irn: status === "Submitted" ? `IRN-${(numberSuffix * 7919).toString(16).toUpperCase()}` : null,
    fbrSubmittedAt: status === "Submitted" ? isoDaysAgo(daysAgo, -1) : null,
    errorMessage:
      status === "Failed"
        ? ["Invalid HS Code", "Network Timeout", "Invalid NTN"][numberSuffix % 3]
        : null,
    items,
    createdAt: isoDaysAgo(daysAgo),
    updatedAt: isoDaysAgo(daysAgo, 1),
  };
}

function seedInvoices(): Invoice[] {
  const list: Invoice[] = [];
  const cust = baseCustomers;
  const statuses: Invoice["status"][] = [
    "Submitted",
    "Submitted",
    "Submitted",
    "Pending",
    "Failed",
    "Draft",
    "Submitted",
    "Submitted",
    "Failed",
    "Submitted",
  ];
  for (let i = 0; i < 25; i++) {
    const status = statuses[i % statuses.length];
    const customer = cust[i % cust.length];
    const days = Math.max(1, 30 - i);
    const amount = [25_000, 12_500, 8900, 15_000, 7500, 18_900, 22_300, 9800, 11_400, 6700][i % 10];
    list.push(makeInvoice(i + 1, status, customer, days, amount));
  }
  return list;
}

export const invoices: Invoice[] = seedInvoices();

// ----------------------------- Audit logs ------------------------------------

export const auditLogs: AuditLogEntry[] = [
  {
    id: "log-1",
    occurredAt: isoMinutesAgo(15),
    userEmail: "ali@acme.pk",
    action: "SubmitInvoice",
    entityType: "Invoice",
    entityId: "inv-3",
    description: "Submitted invoice INV-1003 to FBR.",
    ipAddress: "203.99.45.10",
  },
  {
    id: "log-2",
    occurredAt: isoMinutesAgo(45),
    userEmail: "ayesha@acme.pk",
    action: "Update",
    entityType: "Customer",
    entityId: "cust-2",
    description: "Updated customer XYZ Corporation address.",
    ipAddress: "203.99.45.18",
  },
  {
    id: "log-3",
    occurredAt: isoDaysAgo(0, 1),
    userEmail: "ali@acme.pk",
    action: "Login",
    entityType: "User",
    entityId: "u-1",
    description: "User logged in successfully.",
    ipAddress: "203.99.45.10",
  },
  {
    id: "log-4",
    occurredAt: isoDaysAgo(1),
    userEmail: "bilal@acme.pk",
    action: "Create",
    entityType: "Invoice",
    entityId: "inv-9",
    description: "Created new invoice INV-1009 (Draft).",
    ipAddress: "203.99.45.21",
  },
  {
    id: "log-5",
    occurredAt: isoDaysAgo(1),
    userEmail: "ali@acme.pk",
    action: "RetryInvoice",
    entityType: "Invoice",
    entityId: "inv-5",
    description: "Retried failed invoice INV-1005.",
    ipAddress: "203.99.45.10",
  },
  {
    id: "log-6",
    occurredAt: isoDaysAgo(2),
    userEmail: "ali@acme.pk",
    action: "CertifyScenario",
    entityType: "Scenario",
    entityId: "1",
    description: "Certified scenario SN001 (registered customer goods).",
    ipAddress: "203.99.45.10",
  },
  {
    id: "log-7",
    occurredAt: isoDaysAgo(3),
    userEmail: "ayesha@acme.pk",
    action: "Delete",
    entityType: "Product",
    entityId: "prod-99",
    description: "Deleted obsolete product.",
    ipAddress: "203.99.45.18",
  },
];

// ----------------------------- Error logs (dashboard) -----------------------

export const errorLogs: ErrorLogEntry[] = [
  {
    id: "err-1",
    occurredAt: isoMinutesAgo(95),
    invoiceNumber: "INV-1023",
    message: "Invalid HS Code",
  },
  {
    id: "err-2",
    occurredAt: isoMinutesAgo(125),
    invoiceNumber: "INV-1023",
    message: "Network Timeout",
  },
  {
    id: "err-3",
    occurredAt: isoMinutesAgo(155),
    invoiceNumber: "INV-1021",
    message: "Invalid NTN",
  },
];

// ----------------------------- Scenarios (Phase 3 reuse) ----------------------

const scenarioNames = [
  "Registered Customer (Goods)",
  "Unregistered Customer (Goods)",
  "Cottage Industry",
  "Steel — Melting / Re-rolling",
  "Steel — Ship Breaking",
  "Petroleum / Oil Marketing",
  "Sugar — Wholesale",
  "Mobile Phones",
  "Telecom Services",
  "Banking Services",
  "Toll Manufacturing",
  "Textile — Weaving",
  "Textile — Stitching",
  "Hotel / Restaurant",
  "Sale to Government",
  "Export Sale",
  "Sale through Agent",
  "Sale of Used Vehicle",
  "Pharmaceutical",
  "Goods at 10% Reduced Rate",
  "Sale of Animal Feed",
  "Sale to Retailer",
  "Debit Note (Goods)",
  "Debit Note (Services)",
  "FED Charged (Services)",
  "3rd Schedule Items",
  "Reduced Rate Drugs",
  "Cement (Bulk)",
];

export const scenarios: Scenario[] = scenarioNames.map((name, idx) => {
  const status: Scenario["status"] =
    idx < 10 ? "Passed" : idx < 14 ? "Failed" : "Pending";
  return {
    scenarioNumber: idx + 1,
    scenarioName: name,
    status,
    fbrResponse: status === "Failed" ? "FBR rejected payload schema." : undefined,
    runAt: status === "Pending" ? null : isoDaysAgo(idx % 7),
    certifiedAt: idx < 6 ? isoDaysAgo(idx) : null,
  };
});

// ----------------------------- Helpers exported to handlers ------------------

export const fixtures = { uuid, isoDaysAgo, isoMinutesAgo };
