import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersService, type User } from "@/services/users";
import { toast } from "sonner";

type UserEditDialogProps = {
  user: User;
  children: React.ReactNode; // Trigger visual
  onSaved?: (partial: Partial<User>) => void;
};

export function UserEditDialog({
  user,
  children,
  onSaved,
}: UserEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const initial = useMemo(
    () => ({
      email: user.email || "",
      name: user.name || "",
      surname: user.surname || "",
      isActive: Boolean(user.isActive),
    }),
    [user]
  );

  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onToggleActive = (value: boolean | "indeterminate") => {
    setForm((f) => ({ ...f, isActive: value === true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const profilePayload: {
        email?: string;
        name?: string;
        surname?: string;
      } = {};
      if (form.email !== user.email) profilePayload.email = form.email;
      if (form.name !== user.name) profilePayload.name = form.name;
      if (form.surname !== user.surname) profilePayload.surname = form.surname;

      const willToggleActive = form.isActive !== user.isActive;

      if (!willToggleActive && Object.keys(profilePayload).length === 0) {
        toast("No hay cambios para guardar");
        return;
      }

      if (Object.keys(profilePayload).length > 0) {
        await usersService.updateProfile(user._id, profilePayload);
      }
      if (willToggleActive) {
        await usersService.toggleActive(user._id, form.isActive);
      }

      toast.success("Usuario actualizado");
      onSaved?.({
        ...profilePayload,
        isActive: willToggleActive ? form.isActive : undefined,
      });
      setOpen(false);
    } catch {
      toast.error("No se pudo actualizar el usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form onSubmit={handleSubmit}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modifica los campos permitidos. Guarda para aplicar los cambios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="surname">Apellidos</Label>
                <Input
                  id="surname"
                  name="surname"
                  value={form.surname}
                  onChange={onChange}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={onToggleActive}
                aria-label="Activo"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Activo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
