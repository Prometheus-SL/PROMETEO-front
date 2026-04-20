import { useState } from "react";
import { toast } from "sonner";

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
import { agentsService, type Agent } from "@/services/agents";

type Props = {
  agent: Agent;
  children: React.ReactNode;
  onDeleted?: (id: string) => void;
};

export function AgentDeleteDialog({ agent, children, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await agentsService.delete(agent.id);
      toast.success("Agent deleted");
      onDeleted?.(agent.id);
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Could not delete agent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete agent</DialogTitle>
          <DialogDescription>This removes the machine identity.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{agent.name || agent.id}</p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {agent.id}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Status: {agent.status}
          </p>
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
