import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { agentsService, type Agent } from "@/services/agents";
import { toast } from "sonner";

type Props = {
  agent: Agent;
  children: React.ReactNode;
  onSaved?: (agent: Agent) => void;
};

function safeParseJSON(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text; // deja pasar string si no es JSON válido
  }
}

export function AgentPatchDialog({ agent, children, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(() =>
    JSON.stringify({ name: agent.name, tags: agent.tags }, null, 2)
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    try {
      const patch = safeParseJSON(body) as Partial<Agent>;
      const updated = await agentsService.updateAgent(agent.id, patch);
      toast.success("Agent updated");
      setOpen(false);
      onSaved?.(updated);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update agent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label>Patch (JSON)</Label>
          <textarea
            className="min-h-48 rounded-md border bg-background p-2 font-mono text-xs"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
