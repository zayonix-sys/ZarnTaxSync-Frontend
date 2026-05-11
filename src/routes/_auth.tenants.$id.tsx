import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, Pencil, Power, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TokenStatusCard } from "@/components/tenant/TokenStatusCard";
import { FbrTokenForm } from "@/components/tenant/FbrTokenForm";
import {
  useSetEnvironment,
  useTenant,
  useTenantSettings,
  useToggleTenantActive,
  useTokenStatus,
  useUpdateTenant,
  useUpsertTenantSetting,
  useVerifyFbrRegistration,
} from "@/hooks/useTenants";
import {
  BUSINESS_ACTIVITY_OPTIONS,
  getApplicableScenarios,
  SECTOR_OPTIONS,
  type BusinessActivity,
  type Sector,
} from "@/lib/scenarioMatrix";
import { useCities, useProvinces } from "@/hooks/useReference";
import { formatDate } from "@/lib/format";
import type { Environment, PlanType, TenantSetting } from "@/api/types";
import { ROLE_HIERARCHY } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_auth/tenants/$id")({
  beforeLoad: ({ params }) => {
    const user = useAuthStore.getState().user;
    const role = user?.role;
    const isSuperAdmin = !!role && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.SuperAdmin;
    const isTenantAdminForSameTenant =
      role === "TenantAdmin" && user?.tenantId === params.id;
    if (!isSuperAdmin && !isTenantAdminForSameTenant) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { id } = Route.useParams();
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = !!role && ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.SuperAdmin;
  const { data: tenant, isLoading } = useTenant(id);
  const { data: tokenStatus } = useTokenStatus(id);
  const updateTenant = useUpdateTenant(id);
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/tenants">
            <ArrowLeft className="h-4 w-4" />
            Back to tenants
          </Link>
        </Button>
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/tenants">
            <ArrowLeft className="h-4 w-4" />
            Back to tenants
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {tenant.name}
              </h1>
              {tenant.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              <Badge variant="outline">{tenant.planType}</Badge>
              {tokenStatus && (
                <Badge
                  variant={tokenStatus.environment === "Production" ? "success" : "warning"}
                >
                  {tokenStatus.environment}
                </Badge>
              )}
              {tenant.businessEntityType && (
                <Badge variant={tenant.businessEntityType === "Registered" ? "success" : "warning"}>
                  {tenant.businessEntityType}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.subdomain}.zarntaxsync.com · NTN/CNIC {tenant.ntnCnic}
              {tenant.strn && ` · STRN ${tenant.strn}`} · created {formatDate(tenant.createdAt)}
            </p>
            {tenant.adminEmail && (
              <p className="text-xs text-muted-foreground">
                Admin email: {tenant.adminEmail}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            {isSuperAdmin && (
              <ActiveToggle id={id} active={tenant.isActive} onSuccess={() => navigate({ to: "/tenants/$id", params: { id } })} />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <TokenStatusCard tenantId={id} />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{tenant.branchCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{tenant.userCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="token">FBR Token</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab tenantId={id} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab tenantId={id} />
        </TabsContent>

        <TabsContent value="token">
          <TokenTab tenantId={id} environment={tokenStatus?.environment ?? "Sandbox"} />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                User management for this tenant ships in Phase 5.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Coming soon.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditTenantDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        name={tenant.name}
        ntnCnic={tenant.ntnCnic}
        planType={tenant.planType}
        onSave={async (values) => {
          await updateTenant.mutateAsync(values);
          setEditOpen(false);
        }}
        loading={updateTenant.isPending}
      />
    </div>
  );
}

function EditTenantDialog({
  open,
  onOpenChange,
  name,
  ntnCnic,
  planType,
  onSave,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  ntnCnic: string;
  planType: PlanType;
  onSave: (values: { name: string; ntnCnic: string; planType: PlanType }) => Promise<void>;
  loading: boolean;
}) {
  const [form, setForm] = useState({ name, ntnCnic, planType });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm({ name, ntnCnic, planType });
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tenant</DialogTitle>
          <DialogDescription>
            Update core tenant identifiers. Extended profile fields are editable
            in the Overview tab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
            <Input
              id="tenant-name"
              label="Business name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
            <Input
              id="tenant-ntn"
              label="NTN / CNIC"
              value={form.ntnCnic}
              onChange={(e) => setForm((s) => ({ ...s, ntnCnic: e.target.value }))}
            />
          <div className="space-y-1">
            <Select
              value={form.planType}
              onValueChange={(v) =>
                setForm((s) => ({
                  ...s,
                  planType: v as PlanType,
                }))
              }
            >
              <SelectTrigger label="Plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={() => onSave(form)}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActiveToggle({
  id,
  active,
  onSuccess,
}: {
  id: string;
  active: boolean;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useToggleTenantActive(id);

  return (
    <>
      <Button
        variant={active ? "outline" : "default"}
        onClick={() => setOpen(true)}
        disabled={mutation.isPending}
      >
        <Power className="h-4 w-4" />
        {active ? "Deactivate" : "Activate"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active ? "Deactivate tenant?" : "Activate tenant?"}</DialogTitle>
            <DialogDescription>
              {active
                ? "All users of this tenant will immediately lose access. Their pending invoices will not be submitted."
                : "Users will regain access immediately."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={active ? "destructive" : "default"}
              onClick={async () => {
                await mutation.mutateAsync({ activate: !active });
                setOpen(false);
                onSuccess();
              }}
              disabled={mutation.isPending}
            >
              {active ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -------------------------- Overview tab --------------------------

function OverviewTab({ tenantId }: { tenantId: string }) {
  const { data: tenant } = useTenant(tenantId);
  const updateTenant = useUpdateTenant(tenantId);
  const verify = useVerifyFbrRegistration(tenantId);
  const { data: provinces = [] } = useProvinces();

  const [province, setProvince] = useState(tenant?.province ?? "");
  const { data: cities = [] } = useCities(province || undefined);

  const [form, setForm] = useState({
    strn: tenant?.strn ?? "",
    businessActivity: tenant?.businessActivity ?? "",
    industryType: tenant?.industryType ?? "",
    businessAddress: tenant?.businessAddress ?? "",
    city: tenant?.city ?? "",
    province: tenant?.province ?? "",
    phone: tenant?.phone ?? "",
  });

  const handleSave = async () => {
    if (!tenant) return;
    await updateTenant.mutateAsync({
      name: tenant.name,
      ntnCnic: tenant.ntnCnic,
      planType: tenant.planType,
      strn: form.strn || null,
      businessActivity: form.businessActivity || null,
      industryType: form.industryType || null,
      businessAddress: form.businessAddress || null,
      city: form.city || null,
      province: form.province || null,
      phone: form.phone || null,
    });
  };

  const applicable =
    form.businessActivity && form.industryType
      ? getApplicableScenarios(form.businessActivity as BusinessActivity, form.industryType as Sector)
      : null;

  if (!tenant) return null;

  const regStatus = tenant.registrationStatus?.toLowerCase();
  const regStatusVariant =
    regStatus === "active"
      ? "success"
      : regStatus === "suspended" || regStatus === "inactive"
        ? "warning"
        : regStatus === "blacklist"
          ? "destructive"
          : "secondary";

  return (
    <div className="space-y-4">
      {/* FBR Verification Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              FBR Registration Verification
            </CardTitle>
            <CardDescription>
              Verify your NTN/CNIC against FBR Get_Reg_Type and STATL APIs. Requires a token to be saved first.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => verify.mutate()}
            disabled={verify.isPending}
          >
            {verify.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Verify with FBR</>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {tenant.businessEntityType || tenant.registrationStatus ? (
            <div className="flex flex-wrap gap-3">
              {tenant.businessEntityType && (
                <div className="flex items-center gap-1.5">
                  {tenant.businessEntityType === "Registered" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="text-sm font-medium">Entity type:</span>
                  <Badge variant={tenant.businessEntityType === "Registered" ? "success" : "warning"}>
                    {tenant.businessEntityType}
                  </Badge>
                </div>
              )}
              {tenant.registrationStatus && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={regStatusVariant as "success" | "warning" | "destructive" | "secondary"}>
                    {tenant.registrationStatus}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not yet verified. Click "Verify with FBR" after saving your token.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Registration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Registration details</CardTitle>
          <CardDescription>
            Business activity and industry type are pre-filled from FBR on first verify, then editable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Input
                id="strn"
                label="STRN (Sales Tax Reg. No.)"
                value={form.strn}
                placeholder="e.g. 12-34-5678-012-34"
                onChange={(e) => setForm((s) => ({ ...s, strn: e.target.value }))}
              />
            </div>
            <div />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Business activity</Label>
              <Select
                value={form.businessActivity}
                onValueChange={(v) => setForm((s) => ({ ...s, businessActivity: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity…" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_ACTIVITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Industry type</Label>
              <Select
                value={form.industryType}
                onValueChange={(v) => setForm((s) => ({ ...s, industryType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry…" />
                </SelectTrigger>
                <SelectContent>
                  {SECTOR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Details */}
      <Card>
        <CardHeader>
          <CardTitle>Business address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Street address</Label>
            <Textarea
              value={form.businessAddress}
              placeholder="Full business address…"
              rows={2}
              onChange={(e) => setForm((s) => ({ ...s, businessAddress: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Province</Label>
              <Select
                value={form.province}
                onValueChange={(v) => {
                  setProvince(v);
                  setForm((s) => ({ ...s, province: v, city: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province…" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.code} value={String(p.code)}>
                      {p.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Select
                value={form.city}
                onValueChange={(v) => setForm((s) => ({ ...s, city: v }))}
                disabled={!form.province}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.province ? "Select city…" : "Select province first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Input
                id="phone"
                label="Phone"
                value={form.phone}
                placeholder="+92 21 1234567"
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applicable Scenarios */}
      {applicable && applicable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applicable scenarios</CardTitle>
            <CardDescription>
              {applicable.length} of 28 PRAL sandbox scenarios apply to this tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {applicable.map((n) => (
              <Badge key={n} variant="outline">
                Scenario {n}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateTenant.isPending}>
          {updateTenant.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            "Save profile"
          )}
        </Button>
      </div>
    </div>
  );
}

// -------------------------- Settings tab --------------------------

function SettingsTab({ tenantId }: { tenantId: string }) {
  const { data: settings, isLoading } = useTenantSettings(tenantId);
  const upsert = useUpsertTenantSetting(tenantId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Inline edit. Changes save on blur. Encrypted values are masked until
          revealed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!settings || settings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No settings yet. Settings created by the backend will appear here.
          </p>
        ) : (
          <ul className="divide-y">
            {settings.map((s) => (
              <li key={s.key} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-3">
                <div>
                  <div className="font-medium text-sm">{s.key}</div>
                  {s.description && (
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <SettingValueInput setting={s} onSave={(v) => upsert.mutate({ ...s, value: v })} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SettingValueInput({
  setting,
  onSave,
}: {
  setting: TenantSetting;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(setting.value);
  return (
    setting.isEncrypted ? (
      <PasswordInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== setting.value) onSave(value);
        }}
      />
    ) : (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== setting.value) onSave(value);
        }}
      />
    )
  );
}

// -------------------------- Token tab --------------------------

function TokenTab({ tenantId, environment }: { tenantId: string; environment: Environment }) {
  const setEnv = useSetEnvironment(tenantId);
  const verify = useVerifyFbrRegistration(tenantId);
  const [pendingEnv, setPendingEnv] = useState<Environment | null>(null);
  const [showVerifyHint, setShowVerifyHint] = useState(false);

  const onChange = (next: Environment) => {
    if (next === environment) return;
    if (next === "Production") {
      setPendingEnv(next);
    } else {
      setEnv.mutate(next);
    }
  };

  return (
    <div className="space-y-4">
      {showVerifyHint && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Token saved</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            Run FBR verification to autofill your business details.
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                verify.mutate();
                setShowVerifyHint(false);
              }}
              disabled={verify.isPending}
            >
              {verify.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify now"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active environment</CardTitle>
          <CardDescription>
            Switch between Sandbox and Production. Production sends invoices to
            the live FBR API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={environment}
            onValueChange={(v) => onChange(v as Environment)}
            className="flex gap-6"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="Sandbox" />
              Sandbox
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="Production" />
              Production
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sandbox token</CardTitle>
            <CardDescription>Used for PRAL certification testing.</CardDescription>
          </CardHeader>
          <CardContent>
            <FbrTokenForm
              tenantId={tenantId}
              environment="Sandbox"
              onSaved={() => setShowVerifyHint(true)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production token</CardTitle>
            <CardDescription>Live FBR submissions. Handle with care.</CardDescription>
          </CardHeader>
          <CardContent>
            <FbrTokenForm
              tenantId={tenantId}
              environment="Production"
              onSaved={() => setShowVerifyHint(true)}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!pendingEnv} onOpenChange={(o) => !o && setPendingEnv(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to Production?</DialogTitle>
            <DialogDescription>
              All invoice submissions will be sent to the live FBR API.
              IRNs will be allocated against your real PRAL account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingEnv(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await setEnv.mutateAsync("Production");
                setPendingEnv(null);
              }}
              disabled={setEnv.isPending}
            >
              <RefreshCw className="h-4 w-4" />
              Switch to Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
