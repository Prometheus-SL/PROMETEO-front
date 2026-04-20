import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { type Agent } from "@/services/agents";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AgentDataDialog } from "./agent-data-dialog";
import { AgentDeleteDialog } from "./agent-delete-dialog";
import { AgentPatchDialog } from "./agent-patch-dialog";
import { SendCommandDialog } from "./send-command-dialog";

type ColumnActions = {
  onAgentUpdated?: (agent: Agent) => void;
  onAgentDeleted?: (id: string) => void;
  onRefreshList?: () => void;
};

function formatDate(value?: string) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function statusBadgeClass(status: string) {
  if (status === "online")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "maintenance")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700";
  if (status === "error" || status === "locked")
    return "border-red-500/30 bg-red-500/10 text-red-700";
  return "border-muted bg-muted text-muted-foreground";
}

async function copyAgentId(agentId: string) {
  await navigator.clipboard?.writeText(agentId);
  toast.success("Agent ID copied");
}

export const buildAgentColumns = (
  actions: ColumnActions = {}
): ColumnDef<Agent>[] => [
  {
    id: "agent",
    header: "Agent",
    cell: ({ row }) => {
      const agent = row.original;
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{agent.name || agent.id}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {agent.id}
          </p>
          {agent.description ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {agent.description}
            </p>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "machine",
    header: "Machine",
    cell: ({ row }) => {
      const agent = row.original;
      const hostname = agent.computerInfo?.hostname || agent.location || "-";
      const os = agent.computerInfo?.os?.platform;
      return (
        <div>
          <p className="text-sm">{hostname}</p>
          <p className="text-xs text-muted-foreground">
            {[os, agent.ip].filter(Boolean).join(" / ") || "No system data"}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const agent = row.original;
      return (
        <Badge variant="outline" className={statusBadgeClass(agent.status)}>
          <span
            className={
              agent.status === "online"
                ? "size-1.5 rounded-full bg-emerald-600"
                : "size-1.5 rounded-full bg-current"
            }
            aria-hidden="true"
          />
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const agent = row.original;
      return (
        <div>
          <p className="text-sm">{agent.user?.username || "Unassigned"}</p>
          <p className="text-xs text-muted-foreground">
            {agent.user?.email || agent.user?.name || "No owner"}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "lastSeen",
    header: "Last seen",
    cell: ({ row }) => {
      const agent = row.original;
      return (
        <span className="text-sm text-muted-foreground">
          {formatDate(agent.lastSeen)}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const agent = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <AgentDataDialog agentId={agent.id}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                View Data
              </DropdownMenuItem>
            </AgentDataDialog>
            <DropdownMenuItem onClick={() => void copyAgentId(agent.id)}>
              Copy ID
            </DropdownMenuItem>
            <AgentPatchDialog
              agent={agent}
              onSaved={(updated: Agent) => {
                actions.onAgentUpdated?.(updated);
                actions.onRefreshList?.();
              }}
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Edit Agent
              </DropdownMenuItem>
            </AgentPatchDialog>
            <SendCommandDialog
              agents={[agent]}
              defaultAgentId={agent.id}
              onSent={() => {
                toast.success("Command sent");
                actions.onRefreshList?.();
              }}
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Send Command
              </DropdownMenuItem>
            </SendCommandDialog>
            <AgentDeleteDialog
              agent={agent}
              onDeleted={(id) => {
                actions.onAgentDeleted?.(id);
                actions.onRefreshList?.();
              }}
            >
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => e.preventDefault()}
              >
                Delete Agent
              </DropdownMenuItem>
            </AgentDeleteDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
