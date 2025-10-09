"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usersService, type User } from "@/services/users";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { AdminBadge } from "../admin-badge";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

type ColumnActions = {
  onUserUpdated?: (user: Partial<User> & { _id: string }) => void;
  onUserDeleted?: (id: string) => void;
};

export const buildColumns = (
  actions: ColumnActions = {}
): ColumnDef<User>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    header: "Username",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <p className="flex items-center gap-2">
          {user.username}
          {user.role === "admin" && <AdminBadge />}
        </p>
      );
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
  },
  {
    header: "Active",
    cell: ({ row }) => {
      const user = row.original;
      const handleToggle = async (value: boolean | "indeterminate") => {
        const next = value === true;
        try {
          await usersService.toggleActive(user._id, next);
          toast("User status updated.");
          actions.onUserUpdated?.({ _id: user._id, isActive: next });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err: unknown) {
          toast.error(`Could not update user status. `);
        }
      };
      return (
        <Checkbox
          checked={user.isActive}
          onCheckedChange={handleToggle}
          aria-label="Active"
        />
      );
    },
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "surname",
    header: "Surname",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      const handleDelete = async () => {
        try {
          await usersService.delete(user._id);
          actions.onUserDeleted?.(user._id);
        } catch (err) {
          console.error("No se pudo eliminar el usuario", err);
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="bg-red-400 hover:bg-red-600 text-white"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
