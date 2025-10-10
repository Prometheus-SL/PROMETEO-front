import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usersService, type User } from "@/services/users";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Props = {
  user: User;
  children: React.ReactNode;
  onSaved?: (partial: Partial<User>) => void;
};

export function UserRoleDialog({ user, children, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<User["role"]>(user.role);
  const [confirmed, setConfirmed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === user.role) {
      toast("No hay cambios de rol");
      return;
    }
    setSaving(true);
    try {
      await usersService.updateRole(user._id, role);
      toast.success("Rol actualizado");
      onSaved?.({ role });
      setOpen(false);
    } catch {
      toast.error("No se pudo actualizar el rol");
    } finally {
      setSaving(false);
    }
  };

  return (
  <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setRole(user.role); setConfirmed(false); } }}>
      <form onSubmit={submit}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cambiar rol</DialogTitle>
            <DialogDescription>Selecciona el nuevo rol para el usuario.</DialogDescription>
          </DialogHeader>
          <div className="px-6 -mt-2 text-sm text-muted-foreground">
            <div>Email: <span className="font-medium text-foreground">{user.email}</span></div>
            <div>Rol actual: <span className="font-medium text-foreground">{user.role}</span></div>
          </div>
          <div className="grid gap-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="user"
                checked={role === "user"}
                onChange={() => setRole("user")}
              />
              Usuario
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="role"
                value="admin"
                checked={role === "admin"}
                onChange={() => setRole("admin")}
              />
              Admin
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox id="confirm-role" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            <label htmlFor="confirm-role" className="cursor-pointer text-sm text-muted-foreground">
              Confirmo el cambio de rol
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !confirmed}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
