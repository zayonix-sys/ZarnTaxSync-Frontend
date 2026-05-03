import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Plus,
  Power,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeyOneTimeModal } from "@/components/users/ApiKeyOneTimeModal";
import { RequireRole } from "@/components/common/RequireRole";
import {
  useApiKeys,
  useChangeUserRole,
  useCreateApiKey,
  useRevokeApiKey,
  useToggleUserActive,
  useUnlockUser,
  useUpdateUser,
  useUser,
} from "@/hooks/useUsers";
import { useBranchesList } from "@/hooks/useBranches";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Role } from "@/api/types";
import type { ApiKey, CreateApiKeyResponse } from "@/api/users";

export const Route = createFileRoute("/_auth/users/$id")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { id } = Route.useParams();
  const { data: user, isLoading } = useUser(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/users">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
        <p className="text-muted-foreground">User not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/users">
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              <Mail className="mr-1 inline h-3.5 w-3.5" />
              {user.email}
              {" · "}
              <Badge variant="outline">{user.role}</Badge>
              {" · "}
              {user.isActive ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </p>
          </div>
          <UserActions
            id={user.id}
            isActive={user.isActive}
            isLockedOut={user.isLockedOut}
          />
        </div>
        {user.isLockedOut && (
          <Alert variant="warning" className="mt-4">
            <Lock className="h-4 w-4" />
            <AlertTitle>Account locked</AlertTitle>
            <AlertDescription>
              Auto-locked after 5 failed login attempts. Lockout ends{" "}
              {user.lockoutEnd ? formatDateTime(user.lockoutEnd) : "in 15 minutes"}.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="role">Role</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>
        <TabsContent value="role">
          <RoleTab id={user.id} role={user.role} />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeysTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserActions({
  id,
  isActive,
  isLockedOut,
}: {
  id: string;
  isActive: boolean;
  isLockedOut: boolean;
}) {
  const toggle = useToggleUserActive(id);
  const unlock = useUnlockUser(id);

  return (
    <div className="flex flex-wrap gap-2">
      {isLockedOut && (
        <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
          <Button
            variant="outline"
            onClick={() => unlock.mutate()}
            disabled={unlock.isPending}
          >
            {unlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
            Unlock
          </Button>
        </RequireRole>
      )}
      <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
        <Button
          variant={isActive ? "outline" : "default"}
          onClick={() => toggle.mutate({ activate: !isActive })}
          disabled={toggle.isPending}
        >
          <Power className="h-4 w-4" />
          {isActive ? "Deactivate" : "Activate"}
        </Button>
      </RequireRole>
    </div>
  );
}

// ---------------- Profile tab ----------------------------------------------

const ProfileSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  branchId: z.string().min(1, "Required"),
});
type ProfileValues = z.infer<typeof ProfileSchema>;

function ProfileTab({
  user,
}: {
  user: { id: string; firstName: string; lastName: string; branchId: string | null };
}) {
  const update = useUpdateUser(user.id);
  const { data: branches } = useBranchesList({ pageNumber: 1, pageSize: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      branchId: user.branchId ?? "",
    },
  });
  const branchId = watch("branchId");

  const onSubmit = handleSubmit(async (values) => {
    await update.mutateAsync(values);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update name and assigned branch.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Branch</Label>
            <Select
              value={branchId}
              onValueChange={(v) => setValue("branchId", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {(branches?.items ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && (
              <p className="text-xs text-destructive">{errors.branchId.message}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting || update.isPending}>
              {(isSubmitting || update.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------- Role tab --------------------------------------------------

function RoleTab({ id, role }: { id: string; role: Role }) {
  const [pending, setPending] = useState<Role | null>(null);
  const change = useChangeUserRole(id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role</CardTitle>
        <CardDescription>
          Role changes take effect on the user's next login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Current: {role}</Badge>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Change to</Label>
            <Select
              value={pending ?? ""}
              onValueChange={(v) => setPending(v as Role)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TenantAdmin">TenantAdmin</SelectItem>
                <SelectItem value="BranchManager">BranchManager</SelectItem>
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
            <Button
              disabled={!pending || pending === role || change.isPending}
              onClick={async () => {
                if (!pending) return;
                await change.mutateAsync(pending);
                setPending(null);
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Apply role change
            </Button>
          </RequireRole>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------- API Keys tab ----------------------------------------------

function ApiKeysTab({ userId }: { userId: string }) {
  const { data: keys, isLoading } = useApiKeys(userId);
  const create = useCreateApiKey(userId);
  const revoke = useRevokeApiKey(userId);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Used by ERP/POS integrations via <code>X-Api-Key</code>.
          </CardDescription>
        </div>
        <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New key
          </Button>
        </RequireRole>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !keys || keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="divide-y">
            {keys.map((k) => (
              <ApiKeyRow
                key={k.id}
                apiKey={k}
                onRevoke={() => setRevokeId(k.id)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <CreateApiKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(res) => {
          setCreateOpen(false);
          setCreatedKey(res);
        }}
        creating={create.isPending}
        runCreate={create.mutateAsync}
      />

      <ApiKeyOneTimeModal
        result={createdKey}
        onClose={() => setCreatedKey(null)}
      />

      <Dialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this key?</DialogTitle>
            <DialogDescription>
              Calls using this key will start failing immediately. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!revokeId) return;
                await revoke.mutateAsync(revokeId);
                setRevokeId(null);
              }}
              disabled={revoke.isPending}
            >
              Revoke key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ApiKeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: () => void }) {
  const variant: React.ComponentProps<typeof Badge>["variant"] =
    apiKey.status === "Active"
      ? "success"
      : apiKey.status === "Expired"
        ? "warning"
        : "secondary";
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <KeyRound className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{apiKey.name}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {apiKey.keyPrefix}…
        </span>
      </div>
      <Badge variant={variant} className="ml-2">
        {apiKey.status}
      </Badge>
      <span className="ml-auto text-xs text-muted-foreground">
        {apiKey.expiresAt ? `Expires ${formatDate(apiKey.expiresAt)}` : "No expiry"}
        {apiKey.lastUsedAt && (
          <> · Last used {formatDate(apiKey.lastUsedAt)}</>
        )}
      </span>
      {apiKey.status === "Active" && (
        <RequireRole anyOf={["SuperAdmin", "TenantAdmin"]} hideOnDeny>
          <Button variant="ghost" size="sm" onClick={onRevoke}>
            Revoke
          </Button>
        </RequireRole>
      )}
    </li>
  );
}

const NewKeySchema = z.object({
  name: z.string().min(1, "Required"),
  expiresAt: z.string().optional(),
});
type NewKeyValues = z.infer<typeof NewKeySchema>;

function CreateApiKeyDialog({
  open,
  onClose,
  onCreated,
  creating,
  runCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (res: CreateApiKeyResponse) => void;
  creating: boolean;
  runCreate: (body: { name: string; expiresAt?: string }) => Promise<CreateApiKeyResponse>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewKeyValues>({
    resolver: zodResolver(NewKeySchema),
    defaultValues: { name: "", expiresAt: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await runCreate({
        name: values.name,
        expiresAt: values.expiresAt || undefined,
      });
      reset();
      onCreated(res);
    } catch {
      toast.error("Failed to create API key");
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            Give the key a name (e.g. "Acme POS production") so it's easy to
            identify later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="keyName">Name</Label>
            <Input id="keyName" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="keyExpires">Expires (optional)</Label>
            <Input id="keyExpires" type="date" {...register("expiresAt")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generate key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
