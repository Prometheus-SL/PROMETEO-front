import { buildColumns } from "@/components/admin/users/columns";
import { DataTable } from "@/components/admin/users/data-table";
import { usersService, type User } from "@/services/users";

import { useEffect, useState } from "react";

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

  return <DataTable columns={columns} data={data} />;
}
