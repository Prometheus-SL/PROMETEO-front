import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { usersService, type User } from "@/services/users";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { AdminBadge } from "../admin-badge";
import { toast } from "sonner";
import { UserEditDialog } from "./user-edit-dialog";
import { UserRoleDialog } from "./user-role-dialog";
import { UserResetPasswordDialog } from "./user-reset-password-dialog";
import { UserDeleteDialog } from "./user-delete-dialog";
import { UserRevokeTokensDialog } from "./user-revoke-tokens-dialog";

type ColumnActions = {
  onUserUpdated?: (user: Partial<User> & { _id: string }) => void;
  onUserDeleted?: (id: string) => void;
};

function formatDate(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function roleBadgeClass(role: User["role"]) {
  if (role === "admin") return "border-red-500/30 bg-red-500/10 text-red-700";
  if (role === "operator")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  if (role === "viewer")
    return "border-sky-500/30 bg-sky-500/10 text-sky-700";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
}

export const buildColumns = (
  actions: ColumnActions = {}
): ColumnDef<User>[] => [
  {
    id: "identity",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{user.username}</p>
            {user.role === "admin" && <AdminBadge />}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {[user.name, user.surname].filter(Boolean).join(" ") || user.email}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="break-all text-sm">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <Badge variant="outline" className={roleBadgeClass(role)}>
          {role}
        </Badge>
      );
    },
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
        <Switch
          checked={user.isActive}
          onCheckedChange={handleToggle}
          aria-label="Active"
        />
      );
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last login",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.lastLogin)}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <UserEditDialog
              user={user}
              onSaved={(partial) =>
                actions.onUserUpdated?.({ _id: user._id, ...partial })
              }
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Edit
              </DropdownMenuItem>
            </UserEditDialog>
            <UserRoleDialog
              user={user}
              onSaved={(partial) =>
                actions.onUserUpdated?.({ _id: user._id, ...partial })
              }
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Change role
              </DropdownMenuItem>
            </UserRoleDialog>
            <UserResetPasswordDialog user={user}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Reset password
              </DropdownMenuItem>
            </UserResetPasswordDialog>
            <UserRevokeTokensDialog user={user}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Revoke tokens
              </DropdownMenuItem>
            </UserRevokeTokensDialog>
            <UserDeleteDialog
              user={user}
              onDeleted={(id) => actions.onUserDeleted?.(id)}
            >
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="bg-red-400 hover:bg-red-600 text-white"
              >
                Delete
              </DropdownMenuItem>
            </UserDeleteDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
