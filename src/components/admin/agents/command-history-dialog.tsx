import { useState } from "react";
import { Ban, Terminal } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { controlService, type CommandRecord } from "@/services/control";

type CommandEntry = CommandRecord;

type Props = {
  agentId?: string;
  children: React.ReactNode;
};

export function CommandHistoryDialog({ agentId, children }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commands, setCommands] = useState<CommandEntry[]>([]);

  async function loadCommands() {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 20,
      };
      const res = agentId
        ? await controlService.listAgentCommands(agentId, params)
        : await controlService.listCommands(params);
      setCommands(res.commands ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load commands");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(commandId: string) {
    try {
      await controlService.cancelCommand(commandId, "Cancelled by user");
      setCommands((prev) =>
        prev.map((c) =>
          (c.commandId || c._id) === commandId
            ? { ...c, status: "cancelled" }
            : c,
        ),
      );
      toast.success("Command cancelled");
    } catch (err) {
      toast.error((err as Error).message || "Failed to cancel command");
    }
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "outline" as const;
      case "pending":
      case "queued":
        return "secondary" as const;
      case "cancelled":
      case "failed":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void loadCommands();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="size-5" />
            Command History
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading && (
            <div className="flex justify-center py-6">
              <Spinner className="size-5" />
            </div>
          )}
          {!loading && commands.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No commands found
            </p>
          )}
          {!loading &&
            commands.map((cmd) => (
              <div
                key={cmd.commandId || cmd._id}
                className="flex items-center justify-between border-b px-2 py-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">
                      {cmd.command}
                    </span>
                    <Badge variant={statusVariant(cmd.status)}>
                      {cmd.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cmd.createdAt).toLocaleString()}
                    {cmd.agentId ? ` · Agent: ${cmd.agentId}` : ""}
                  </p>
                </div>
                {(cmd.status === "pending" || cmd.status === "queued") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancel(cmd.commandId || cmd._id)}
                  >
                    <Ban className="size-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
