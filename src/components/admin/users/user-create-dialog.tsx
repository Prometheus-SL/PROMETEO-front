import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import {
  usersService,
  type CreateUserPayload,
  type User,
  type UserRole,
} from "@/services/users";

const emptyForm: CreateUserPayload = {
  username: "",
  email: "",
  password: "",
  role: "user",
  name: "",
  surname: "",
  isActive: true,
};

type Props = {
  children?: React.ReactNode;
  onCreated?: (user: User) => void;
};

export function UserCreateDialog({ children, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  function patchForm(patch: Partial<CreateUserPayload>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const user = await usersService.create(form);
      toast.success("User created");
      onCreated?.(user);
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Could not create user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            New user
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            Add an account with the right access level from day one.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="new-user-username">Username</Label>
              <Input
                id="new-user-username"
                value={form.username}
                onChange={(event) => patchForm({ username: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                value={form.email}
                onChange={(event) => patchForm({ email: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-name">Name</Label>
              <Input
                id="new-user-name"
                value={form.name}
                onChange={(event) => patchForm({ name: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-surname">Surname</Label>
              <Input
                id="new-user-surname"
                value={form.surname}
                onChange={(event) => patchForm({ surname: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-password">Temporary password</Label>
              <Input
                id="new-user-password"
                type="password"
                minLength={12}
                value={form.password}
                onChange={(event) => patchForm({ password: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  patchForm({ role: value as UserRole })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="new-user-active">Active account</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                User can sign in immediately.
              </p>
            </div>
            <Switch
              id="new-user-active"
              checked={form.isActive}
              onCheckedChange={(isActive) => patchForm({ isActive })}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
