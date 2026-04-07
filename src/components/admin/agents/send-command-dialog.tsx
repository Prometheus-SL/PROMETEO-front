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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentsService, type Agent } from "@/services/agents";
import { toast } from "sonner";

type Props = {
  agents?: Agent[];
  defaultAgentId?: string;
  onSent?: () => void;
  label?: string;
  children: React.ReactNode;
};

function safeParseJSON(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text; // deja pasar string si no es JSON válido
  }
}

export function SendCommandDialog({
  agents = [],
  defaultAgentId,
  onSent,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [agentId, setAgentId] = useState<string | "all">(
    defaultAgentId ?? "all"
  );
  const [args, setArgs] = useState("{}");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        command: command.trim(),
        agentId: agentId === "all" ? undefined : agentId,
        args: safeParseJSON(args),
      };
      if (!payload.command) {
        toast.error("Command is required");
        setSubmitting(false);
        return;
      }
      await agentsService.sendCommand(payload);
      toast.success("Command sent");
      setOpen(false);
      setCommand("");
      onSent?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send command");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Send Command to Agents</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="agent-select">Destination</Label>
            <select
              id="agent-select"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={agentId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setAgentId(e.target.value as "all" | string)
              }
            >
              <option value="all">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ? `${a.name} (${a.id})` : a.id}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-command">Command</Label>
            <Input
              id="agent-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="restart, update, ..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-args">Args (JSON)</Label>
            <textarea
              id="agent-args"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              className="min-h-24 rounded-md border bg-background p-2 font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
