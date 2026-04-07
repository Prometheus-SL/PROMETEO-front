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
};

export function UserRevokeTokensDialog({ user, children }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await usersService.closeSessions(user._id);
      toast.success("Sesiones revocadas");
      setOpen(false);
    } catch {
      toast.error("No se pudieron revocar las sesiones");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Revocar sesiones</DialogTitle>
          <DialogDescription>
            Se cerrarán todas las sesiones abiertas para "{user.email}". ¿Deseas
            continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Revocando..." : "Revocar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
