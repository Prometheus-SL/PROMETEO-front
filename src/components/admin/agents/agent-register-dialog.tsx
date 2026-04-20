import { useState, type FormEvent } from "react";
import { Copy, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  agentsService,
  type Agent,
  type RegisterAgentPayload,
} from "@/services/agents";

const emptyForm: RegisterAgentPayload = {
  id: "",
  name: "",
  description: "",
  location: "",
};

type Props = {
  children?: React.ReactNode;
  onCreated?: (agent: Agent) => void;
};

export function AgentRegisterDialog({ children, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RegisterAgentPayload>(emptyForm);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function patchForm(patch: Partial<RegisterAgentPayload>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const agent = await agentsService.registerAgent(form);
      setCreatedAgent(agent);
      onCreated?.(agent);
      toast.success("Agent registered");
    } catch (err) {
      toast.error((err as Error).message || "Could not register agent");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyApiKey() {
    if (!createdAgent?.apiKey) return;
    await navigator.clipboard?.writeText(createdAgent.apiKey);
    toast.success("API key copied");
  }

  function resetAndClose(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setForm(emptyForm);
      setCreatedAgent(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            Register agent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Register agent</DialogTitle>
          <DialogDescription>
            Create a machine identity and keep the generated key visible here.
          </DialogDescription>
        </DialogHeader>

        {createdAgent ? (
          <div className="grid gap-4">
            <div className="rounded-md border bg-muted/40 p-4">
              <p className="text-sm font-medium">{createdAgent.name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {createdAgent.id}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agent-api-key">API key</Label>
              <Textarea
                id="agent-api-key"
                readOnly
                value={createdAgent.apiKey ?? ""}
                className="min-h-24 font-mono text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={copyApiKey}>
                <Copy className="size-4" />
                Copy key
              </Button>
              <Button type="button" onClick={() => resetAndClose(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="agent-id">Agent ID</Label>
                <Input
                  id="agent-id"
                  value={form.id}
                  onChange={(event) => patchForm({ id: event.target.value })}
                  placeholder="studio-desk-01"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-name">Name</Label>
                <Input
                  id="agent-name"
                  value={form.name}
                  onChange={(event) => patchForm({ name: event.target.value })}
                  placeholder="Studio Desk"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="agent-location">Location</Label>
                <Input
                  id="agent-location"
                  value={form.location}
                  onChange={(event) =>
                    patchForm({ location: event.target.value })
                  }
                  placeholder="Office, studio, rack..."
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="agent-description">Description</Label>
                <Textarea
                  id="agent-description"
                  value={form.description}
                  onChange={(event) =>
                    patchForm({ description: event.target.value })
                  }
                  placeholder="What this machine does"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetAndClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Registering..." : "Register agent"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
