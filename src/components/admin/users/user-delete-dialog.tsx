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
import { toast } from "sonner";

type Props = {
  user: User;
  children: React.ReactNode;
  onDeleted?: (id: string) => void;
};

export function UserDeleteDialog({ user, children, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await usersService.delete(user._id);
      toast.success("Usuario eliminado");
      onDeleted?.(user._id);
      setOpen(false);
    } catch {
      toast.error("No se pudo eliminar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 -mt-2 text-sm text-muted-foreground">
          <div>Email: <span className="font-medium text-foreground">{user.email}</span></div>
          <div>Rol: <span className="font-medium text-foreground">{user.role}</span></div>
          <div>Activo: <span className="font-medium text-foreground">{user.isActive ? "Sí" : "No"}</span></div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>Cancelar</Button>
          </DialogClose>
          <Button variant="destructive" onClick={submit} disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
