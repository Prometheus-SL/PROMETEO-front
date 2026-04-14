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
      toast.success("User deleted");
      onDeleted?.(user._id);
      setOpen(false);
    } catch {
      toast.error("Could not delete the user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="px-6 -mt-2 text-sm text-muted-foreground">
          <div>
            Email:{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          <div>
            Role:{" "}
            <span className="font-medium text-foreground">{user.role}</span>
          </div>
          <div>
            Active:{" "}
            <span className="font-medium text-foreground">
              {user.isActive ? "Yes" : "No"}
            </span>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={submit} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
