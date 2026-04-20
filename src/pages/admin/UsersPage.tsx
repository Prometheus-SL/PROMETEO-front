import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { buildColumns } from "@/components/admin/users/columns";
import { DataTable } from "@/components/admin/users/data-table";
import { UserCreateDialog } from "@/components/admin/users/user-create-dialog";
import { UserDeleteDialog } from "@/components/admin/users/user-delete-dialog";
import { UserEditDialog } from "@/components/admin/users/user-edit-dialog";
import { UserResetPasswordDialog } from "@/components/admin/users/user-reset-password-dialog";
import { UserRevokeTokensDialog } from "@/components/admin/users/user-revoke-tokens-dialog";
import { UserRoleDialog } from "@/components/admin/users/user-role-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { exportsService } from "@/services/exports";
import {
  usersService,
  type PagedUsers,
  type User,
  type UserRole,
} from "@/services/users";

type StatusFilter = "all" | "active" | "inactive";
type ActivityFilter = "all" | "recent" | "dormant" | "never";

const emptyUsers: PagedUsers = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  pages: 1,
};

function isWithinDays(value: string | undefined, days: number) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

function isDormant(user: User) {
  if (!user.lastLogin) return true;
  return !isWithinDays(user.lastLogin, 30);
}

function filterByActivity(users: User[], activity: ActivityFilter) {
  if (activity === "recent")
    return users.filter((user) => isWithinDays(user.lastLogin, 7));
  if (activity === "dormant") return users.filter(isDormant);
  if (activity === "never") return users.filter((user) => !user.lastLogin);
  return users;
}

function formatDate(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function roleBadgeClass(role: UserRole) {
  if (role === "admin") return "border-red-500/30 bg-red-500/10 text-red-700";
  if (role === "operator")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  if (role === "viewer")
    return "border-sky-500/30 bg-sky-500/10 text-sky-700";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function UserMobileCard({
  user,
  selected,
  onToggleSelected,
  onUpdated,
  onDeleted,
}: {
  user: User;
  selected: boolean;
  onToggleSelected?: () => void;
  onUpdated: (partial: Partial<User> & { _id: string }) => void;
  onDeleted: (id: string) => void;
}) {
  async function toggleActive(value: boolean) {
    try {
      await usersService.toggleActive(user._id, value);
      onUpdated({ _id: user._id, isActive: value });
      toast.success("User status updated");
    } catch (err) {
      toast.error((err as Error).message || "Could not update user");
    }
  }

  return (
    <div className="rounded-md border bg-background p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label="Select user"
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{user.username}</p>
              <p className="break-all text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Badge variant="outline" className={roleBadgeClass(user.role)}>
              {user.role}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {[user.name, user.surname].filter(Boolean).join(" ") || "No name"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Active</span>
          <Switch
            checked={user.isActive}
            onCheckedChange={(value) => void toggleActive(value)}
            aria-label="Active"
          />
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Last login</span>
          <span className="text-right">{formatDate(user.lastLogin)}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <UserEditDialog
          user={user}
          onSaved={(partial) => onUpdated({ _id: user._id, ...partial })}
        >
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </UserEditDialog>
        <UserRoleDialog
          user={user}
          onSaved={(partial) => onUpdated({ _id: user._id, ...partial })}
        >
          <Button variant="outline" size="sm">
            Role
          </Button>
        </UserRoleDialog>
        <UserResetPasswordDialog user={user}>
          <Button variant="outline" size="sm">
            Password
          </Button>
        </UserResetPasswordDialog>
        <UserRevokeTokensDialog user={user}>
          <Button variant="outline" size="sm">
            Sessions
          </Button>
        </UserRevokeTokensDialog>
        <UserDeleteDialog user={user} onDeleted={onDeleted}>
          <Button variant="destructive" size="sm" className="col-span-2">
            Delete
          </Button>
        </UserDeleteDialog>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [data, setData] = useState<PagedUsers>(emptyUsers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchRole, setBatchRole] = useState<UserRole>("user");
  const [batchLoading, setBatchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await usersService.listPaged({
        query: query.trim(),
        role: roleFilter,
        isActive:
          statusFilter === "all" ? "all" : statusFilter === "active",
        page,
        pageSize,
      });
      setData(next);
      setSelectedIds(new Set());
    } catch (err) {
      const message = (err as Error).message || "Could not load users";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshUsers();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshUsers]);

  const visibleUsers = useMemo(
    () => filterByActivity(data.items, activityFilter),
    [activityFilter, data.items],
  );

  const applyUserUpdate = useCallback(
    (partial: Partial<User> & { _id: string }) =>
      setData((prev) => ({
        ...prev,
        items: prev.items.map((user) =>
          user._id === partial._id ? { ...user, ...partial } : user,
        ),
      })),
    [],
  );

  const removeUser = useCallback(
    (id: string) =>
      setData((prev) => ({
        ...prev,
        items: prev.items.filter((user) => user._id !== id),
        total: Math.max(0, prev.total - 1),
      })),
    [],
  );

  const columns = useMemo(
    () =>
      buildColumns({
        onUserUpdated: applyUserUpdate,
        onUserDeleted: removeUser,
      }),
    [applyUserUpdate, removeUser],
  );

  const metrics = useMemo(() => {
    const active = visibleUsers.filter((user) => user.isActive).length;
    const admins = visibleUsers.filter((user) => user.role === "admin").length;
    const recent = visibleUsers.filter((user) =>
      isWithinDays(user.lastLogin, 7),
    ).length;
    const dormant = visibleUsers.filter(isDormant).length;
    return { active, admins, recent, dormant };
  }, [visibleUsers]);

  const pages = Math.max(1, data.pages || Math.ceil(data.total / pageSize));

  function resetToFirstPage() {
    setPage(1);
  }

  async function handleExport(format: "csv" | "json") {
    try {
      await exportsService.exportUsers(format);
      toast.success(`Users exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error((err as Error).message || "Export failed");
    }
  }

  async function handleBatchStatus(isActive: boolean) {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setBatchLoading(true);
    try {
      await usersService.batchStatus([...selectedIds], isActive);
      await refreshUsers();
      toast.success(
        `${count} user(s) ${isActive ? "activated" : "deactivated"}`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Batch update failed");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchRole() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setBatchLoading(true);
    try {
      await usersService.batchRole([...selectedIds], batchRole);
      await refreshUsers();
      toast.success(`${count} user(s) moved to ${batchRole}`);
    } catch (err) {
      toast.error((err as Error).message || "Batch update failed");
    } finally {
      setBatchLoading(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const ids = visibleUsers.map((user) => user._id);
    const allSelected =
      ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(ids));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Administration
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Users command center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage access, roles, session resets, and risky dormant accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <UserCreateDialog
            onCreated={(user) => {
              setData((prev) => ({
                ...prev,
                items: [user, ...prev.items].slice(0, pageSize),
                total: prev.total + 1,
              }));
            }}
          />
          <Button
            variant="outline"
            onClick={() => void refreshUsers()}
            disabled={loading}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport("json")}>
            <Download className="size-4" />
            JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Matching users"
          value={data.total}
          detail={`${visibleUsers.length} visible on this page`}
        />
        <MetricCard
          icon={UserCheck}
          label="Active visible"
          value={metrics.active}
          detail="Can sign in now"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Admins visible"
          value={metrics.admins}
          detail="High privilege accounts"
        />
        <MetricCard
          icon={UserPlus}
          label="Dormant visible"
          value={metrics.dormant}
          detail={`${metrics.recent} logged in this week`}
        />
      </div>

      <div className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetToFirstPage();
            }}
            placeholder="Search name, username, email..."
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value as UserRole | "all");
            resetToFirstPage();
          }}
        >
          <SelectTrigger className="w-full lg:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as StatusFilter);
            resetToFirstPage();
          }}
        >
          <SelectTrigger className="w-full lg:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={activityFilter}
          onValueChange={(value) => setActivityFilter(value as ActivityFilter)}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity</SelectItem>
            <SelectItem value="recent">Recent 7d</SelectItem>
            <SelectItem value="dormant">Dormant 30d</SelectItem>
            <SelectItem value="never">Never logged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-medium">{selectedIds.size} selected</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={batchLoading}
              onClick={() => handleBatchStatus(true)}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={batchLoading}
              onClick={() => handleBatchStatus(false)}
            >
              Deactivate
            </Button>
            <Select
              value={batchRole}
              onValueChange={(value) => setBatchRole(value as UserRole)}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" disabled={batchLoading} onClick={handleBatchRole}>
              Apply role
            </Button>
          </div>
        </div>
      ) : null}

      {loading && data.items.length === 0 ? (
        <div className="grid gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={visibleUsers}
          getRowId={(user) => user._id}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onToggleAll={toggleAllVisible}
          emptyMessage={error ?? "No users match these filters."}
          mobileCardRenderer={({ row, selected, onToggleSelected }) => (
            <UserMobileCard
              user={row}
              selected={selected}
              onToggleSelected={onToggleSelected}
              onUpdated={applyUserUpdate}
              onDeleted={removeUser}
            />
          )}
        />
      )}

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {loading ? "Loading..." : `${data.total} matching users`}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
          >
            Next
          </Button>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
