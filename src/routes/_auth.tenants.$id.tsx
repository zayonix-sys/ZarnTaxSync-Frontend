import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, Power, RefreshCw } from "lucide-react";

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
import { TokenStatusCard } from "@/components/tenant/TokenStatusCard";
import { FbrTokenForm } from "@/components/tenant/FbrTokenForm";
import {
  useSetEnvironment,
  useTenant,
  useTenantSettings,
  useToggleTenantActive,
  useTokenStatus,
  useUpsertTenantSetting,
} from "@/hooks/useTenants";
import { useTenantProfileStore } from "@/stores/tenantProfile";
import {
  BUSINESS_ACTIVITY_OPTIONS,
  getApplicableScenarios,
  SECTOR_OPTIONS,
  type BusinessActivity,
  type Sector,
} from "@/lib/scenarioMatrix";
import { formatDate } from "@/lib/format";
import type { Environment, TenantSetting } from "@/api/types";

export const Route = createFileRoute("/_auth/tenants/$id")({
  component: TenantDetailPage,
});

function TenantDetailPage() {
  const { id } = Route.useParams();
  const { data: tenant, isLoading } = useTenant(id);
  const { data: tokenStatus } = useTokenStatus(id);
  const navigate = useNavigate();

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
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenant.subdomain}.zarntaxsync.com · NTN/CNIC {tenant.ntnCnic} ·
              created {formatDate(tenant.createdAt)}
            </p>
          </div>
          <ActiveToggle id={id} active={tenant.isActive} onSuccess={() => navigate({ to: "/tenants/$id", params: { id } })} />
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
    </div>
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
  const profile = useTenantProfileStore((s) => s.profiles[tenantId]);
  const setProfile = useTenantProfileStore((s) => s.setProfile);

  const applicable =
    profile?.businessActivity && profile?.sector
      ? getApplicableScenarios(profile.businessActivity, profile.sector)
      : null;

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Backend gap N4 — local stand-in</AlertTitle>
        <AlertDescription>
          The tenant DTO doesn't yet include <code>businessActivity</code> or{" "}
          <code>sector</code>. Selections below are persisted locally in your
          browser so the Phase 3 scenario filter can use them. They will
          migrate to the backend once N4 ships.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Business activity</CardTitle>
          <CardDescription>
            Drives the applicable PRAL sandbox scenarios on the Scenarios page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Activity</Label>
            <Select
              value={profile?.businessActivity ?? ""}
              onValueChange={(v) =>
                setProfile(tenantId, { businessActivity: v as BusinessActivity })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select activity" />
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
          <div className="space-y-2">
            <Label>Sector</Label>
            <Select
              value={profile?.sector ?? ""}
              onValueChange={(v) =>
                setProfile(tenantId, { sector: v as Sector })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sector" />
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
        </CardContent>
      </Card>

      {applicable && (
        <Card>
          <CardHeader>
            <CardTitle>Applicable scenarios</CardTitle>
            <CardDescription>
              {applicable.length} of 28 PRAL sandbox scenarios apply to this
              tenant.
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
  const [revealed, setRevealed] = useState(!setting.isEncrypted);
  return (
    <div className="flex items-center gap-2">
      <Input
        type={setting.isEncrypted && !revealed ? "password" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (value !== setting.value) onSave(value);
        }}
      />
      {setting.isEncrypted && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? "Hide" : "Reveal"}
        </Button>
      )}
    </div>
  );
}

// -------------------------- Token tab --------------------------

function TokenTab({ tenantId, environment }: { tenantId: string; environment: Environment }) {
  const setEnv = useSetEnvironment(tenantId);
  const [pendingEnv, setPendingEnv] = useState<Environment | null>(null);

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
            <FbrTokenForm tenantId={tenantId} environment="Sandbox" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production token</CardTitle>
            <CardDescription>Live FBR submissions. Handle with care.</CardDescription>
          </CardHeader>
          <CardContent>
            <FbrTokenForm tenantId={tenantId} environment="Production" />
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
