import { buildColumns } from "@/components/admin/users/columns";
import { DataTable } from "@/components/admin/users/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usersService, type User } from "@/services/users";

import { useEffect, useMemo, useState } from "react";

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);

  useEffect(() => {
    usersService.list().then(setData);
  }, []);

  const columns = buildColumns({
    onUserUpdated: (partial) =>
      setData((prev) =>
        prev.map((u) => (u._id === partial._id ? { ...u, ...partial } : u))
      ),
    onUserDeleted: (id) => setData((prev) => prev.filter((u) => u._id !== id)),
  });

  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((u) => u.isActive).length;
    const admins = data.filter((u) => u.role === "admin").length;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const logins7d = data.filter((u) => {
      if (!u.lastLogin) return false;
      const ts = Date.parse(u.lastLogin);
      if (Number.isNaN(ts)) return false;
      return now - ts <= sevenDays;
    }).length;
    return { total, active, admins, logins7d };
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Total en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activos</CardTitle>
            <CardDescription>Con acceso habilitado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admins</CardTitle>
            <CardDescription>Usuarios con rol admin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Logins 7 días</CardTitle>
            <CardDescription>Últimos 7 días</CardDescription>
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
