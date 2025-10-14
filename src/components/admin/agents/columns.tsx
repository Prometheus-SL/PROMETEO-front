"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AgentPatchDialog } from "./agent-patch-dialog";
import { SendCommandDialog } from "./send-command-dialog";

type ColumnActions = {
  onAgentUpdated?: (agent: Agent) => void;
  onRefreshList?: () => void;
};

export const buildAgentColumns = (
  actions: ColumnActions = {}
): ColumnDef<Agent>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => {
      const agent = row.original;
      return <span className="font-mono text-xs">{agent.id}</span>;
    },
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const agent = row.original;
      return agent.name || "-";
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const agent = row.original;
      return (
        <Badge
          className={
            agent.status === "online"
              ? "rounded-full border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5"
              : "bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive rounded-full border-none focus-visible:outline-none"
          }
        >
          <span
            className={
              agent.status === "online"
                ? "size-1.5 rounded-full bg-green-600 dark:bg-green-400"
                : "bg-destructive size-1.5 rounded-full"
            }
            aria-hidden="true"
          />
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "ip",
    header: "IP",
    cell: ({ row }) => {
      const agent = row.original;
      return agent.ip || "-";
    },
  },
  {
    accessorKey: "lastSeen",
    header: "Last Seen",
    cell: ({ row }) => {
      const agent = row.original;
      return agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : "-";
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const agent = row.original;
      if (!agent.tags || agent.tags.length === 0) {
        return "-";
      }
      return (
        <div className="flex flex-wrap gap-1">
          {agent.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800"
            >
              {tag}
            </span>
          ))}
          {agent.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{agent.tags.length - 3}
            </span>
          )}
        </div>
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
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
