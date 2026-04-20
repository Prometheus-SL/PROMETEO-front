import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { buildColumns } from "@/components/admin/users/columns";
import { DataTable } from "@/components/admin/users/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usersService, type User } from "@/services/users";
import { exportsService } from "@/services/exports";

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    usersService.list().then(setData);
  }, []);

  const columns = buildColumns({
    onUserUpdated: (partial) =>
      setData((prev) =>
        prev.map((user) =>
          user._id === partial._id ? { ...user, ...partial } : user,
        ),
      ),
    onUserDeleted: (id) =>
      setData((prev) => prev.filter((user) => user._id !== id)),
  });

  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((user) => user.isActive).length;
    const admins = data.filter((user) => user.role === "admin").length;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const logins7d = data.filter((user) => {
      if (!user.lastLogin) return false;
      const timestamp = Date.parse(user.lastLogin);
      if (Number.isNaN(timestamp)) return false;
      return now - timestamp <= sevenDays;
    }).length;

    return { total, active, admins, logins7d };
  }, [data]);

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
    setBatchLoading(true);
    try {
      await usersService.batchStatus([...selectedIds], isActive);
      setData((prev) =>
        prev.map((u) => (selectedIds.has(u._id) ? { ...u, isActive } : u)),
      );
      setSelectedIds(new Set());
      toast.success(
        `${selectedIds.size} user(s) ${isActive ? "activated" : "deactivated"}`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Batch update failed");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchRole(
    role: "admin" | "operator" | "viewer" | "user",
  ) {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      await usersService.batchRole([...selectedIds], role);
      setData((prev) =>
        prev.map((u) => (selectedIds.has(u._id) ? { ...u, role } : u)),
      );
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} user(s) updated to ${role}`);
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

  function toggleAll() {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((u) => u._id)));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Total users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active</CardTitle>
            <CardDescription>Users with access enabled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
            <CardDescription>Users with the admin role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Logins in 7 days</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.logins7d}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
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
              <Button
                variant="outline"
                size="sm"
                disabled={batchLoading}
                onClick={() => handleBatchRole("admin")}
              >
                Set Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={batchLoading}
                onClick={() => handleBatchRole("user")}
              >
                Set User
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="size-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
          >
            <Download className="size-4 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelected}
        onToggleAll={toggleAll}
      />
    </div>
  );
}
