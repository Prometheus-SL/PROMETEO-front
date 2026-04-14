import { useEffect, useMemo, useState } from "react";

import { buildColumns } from "@/components/admin/users/columns";
import { DataTable } from "@/components/admin/users/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usersService, type User } from "@/services/users";

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);

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
      <DataTable columns={columns} data={data} />
    </div>
  );
}
