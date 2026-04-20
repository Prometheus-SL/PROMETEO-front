import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Copy,
  Download,
  Eye,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { AgentDataDialog } from "@/components/admin/agents/agent-data-dialog";
import { AgentDeleteDialog } from "@/components/admin/agents/agent-delete-dialog";
import { AgentDataTable } from "@/components/admin/agents/data-table";
import { AgentPatchDialog } from "@/components/admin/agents/agent-patch-dialog";
import { AgentRegisterDialog } from "@/components/admin/agents/agent-register-dialog";
import { buildAgentColumns } from "@/components/admin/agents/columns";
import { CommandHistoryDialog } from "@/components/admin/agents/command-history-dialog";
import { SendCommandDialog as AgentSendCommandDialog } from "@/components/admin/agents/send-command-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { agentsService, type Agent } from "@/services/agents";
import { exportsService } from "@/services/exports";

type PagedAgents = {
  items: Agent[];
  total: number;
  page: number;
  pageSize: number;
};

type StatusFilter =
  | "all"
  | "online"
  | "offline"
  | "maintenance"
  | "error"
  | "locked";

const emptyAgents: PagedAgents = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
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

function AgentMobileCard({
  agent,
  selected,
  onToggleSelected,
  onUpdated,
  onDeleted,
  onRefresh,
}: {
  agent: Agent;
  selected: boolean;
  onToggleSelected?: () => void;
  onUpdated: (agent: Agent) => void;
  onDeleted: (id: string) => void;
  onRefresh: () => void;
}) {
  const hostname = agent.computerInfo?.hostname || agent.location || "No host";
  const os = agent.computerInfo?.os?.platform;
  const owner = agent.user?.username || "Unassigned";

  return (
    <div
      className="rounded-md border bg-background p-4 shadow-xs"
      data-state={selected ? "selected" : undefined}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label="Select agent"
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{agent.name || agent.id}</p>
              <p className="break-all font-mono text-xs text-muted-foreground">
                {agent.id}
              </p>
            </div>
            <Badge variant="outline" className={statusBadgeClass(agent.status)}>
              {agent.status}
            </Badge>
          </div>
          {agent.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {agent.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Machine</span>
          <span className="truncate text-right">{hostname}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">System</span>
          <span className="truncate text-right">
            {[os, agent.ip].filter(Boolean).join(" / ") || "No data"}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Owner</span>
          <span className="truncate text-right">{owner}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Last seen</span>
          <span className="text-right">{formatDate(agent.lastSeen)}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        <AgentDataDialog agentId={agent.id}>
          <Button variant="outline" size="icon" aria-label="View data">
            <Eye className="size-4" />
          </Button>
        </AgentDataDialog>
        <AgentPatchDialog
          agent={agent}
          onSaved={(updated) => {
            onUpdated(updated);
            onRefresh();
          }}
        >
          <Button variant="outline" size="icon" aria-label="Edit agent">
            <Pencil className="size-4" />
          </Button>
        </AgentPatchDialog>
        <AgentSendCommandDialog
          agents={[agent]}
          defaultAgentId={agent.id}
          onSent={() => {
            toast.success("Command sent");
            onRefresh();
          }}
        >
          <Button variant="outline" size="icon" aria-label="Send command">
            <Terminal className="size-4" />
          </Button>
        </AgentSendCommandDialog>
        <Button
          variant="outline"
          size="icon"
          aria-label="Copy agent ID"
          onClick={() => void copyAgentId(agent.id)}
        >
          <Copy className="size-4" />
        </Button>
        <AgentDeleteDialog
          agent={agent}
          onDeleted={(id) => {
            onDeleted(id);
            onRefresh();
          }}
        >
          <Button variant="outline" size="icon" aria-label="Delete agent">
            <Trash2 className="size-4" />
          </Button>
        </AgentDeleteDialog>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [data, setData] = useState<PagedAgents>(emptyAgents);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await agentsService.list({
        query: query.trim(),
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        pageSize,
      });
      setData(res);
      setSelectedIds(new Set());
    } catch (err) {
      const message = (err as Error).message || "Error loading agents";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshList();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [refreshList]);

  const columns = useMemo(
    () =>
      buildAgentColumns({
        onAgentUpdated: (updated: Agent) => {
          setData((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }));
        },
        onAgentDeleted: (id: string) => {
          setData((prev) => ({
            ...prev,
            items: prev.items.filter((item) => item.id !== id),
            total: Math.max(0, prev.total - 1),
          }));
        },
        onRefreshList: refreshList,
      }),
    [refreshList],
  );

  const selectedAgents = useMemo(
    () => data.items.filter((agent) => selectedIds.has(agent.id)),
    [data.items, selectedIds],
  );

  const pages = Math.max(1, Math.ceil((data.total || 0) / pageSize));

  function updateAgentInList(updated: Agent) {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === updated.id ? updated : item,
      ),
    }));
  }

  function deleteAgentFromList(id: string) {
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      total: Math.max(0, prev.total - 1),
    }));
  }

  async function handleExport(format: "csv" | "json") {
    try {
      await exportsService.exportAgents(format);
      toast.success(`Agents exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error((err as Error).message || "Export failed");
    }
  }

  async function handleCommandExport() {
    try {
      await exportsService.exportCommands("csv");
      toast.success("Commands exported as CSV");
    } catch (err) {
      toast.error((err as Error).message || "Export failed");
    }
  }

  async function handleBatchStatus(isActive: boolean) {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    setBatchLoading(true);
    try {
      await agentsService.batchStatus([...selectedIds], isActive);
      await refreshList();
      toast.success(
        `${count} agent(s) ${isActive ? "activated" : "deactivated"}`,
      );
    } catch (err) {
      toast.error((err as Error).message || "Batch update failed");
    } finally {
      setBatchLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Administration
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agents operations
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track machines, register identities, inspect telemetry, and send
            commands.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AgentRegisterDialog
            onCreated={() => {
              void refreshList();
            }}
          />
          <AgentSendCommandDialog
            agents={data.items}
            onSent={() => toast.success("Command sent")}
          >
            <Button variant="outline">
              <Terminal className="size-4" />
              Command
            </Button>
          </AgentSendCommandDialog>
          <CommandHistoryDialog>
            <Button variant="outline">
              <Activity className="size-4" />
              History
            </Button>
          </CommandHistoryDialog>
          <Button
            variant="outline"
            onClick={() => void refreshList()}
            disabled={loading}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => handleExport("csv")}>
            <Download className="size-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport("json")}>
            <Download className="size-4" />
            JSON
          </Button>
          <Button variant="outline" onClick={() => void handleCommandExport()}>
            <Download className="size-4" />
            Commands
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-background p-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search agent ID or name..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/40 p-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-medium">{selectedIds.size} selected</p>
          <div className="flex flex-wrap gap-2">
            <AgentSendCommandDialog
              agents={selectedAgents}
              onSent={() => toast.success("Command sent")}
            >
              <Button variant="outline" size="sm">
                <Terminal className="size-4" />
                Send selected
              </Button>
            </AgentSendCommandDialog>
            <Button
              variant="outline"
              size="sm"
              disabled={batchLoading}
              onClick={() => handleBatchStatus(true)}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={batchLoading}
              onClick={() => handleBatchStatus(false)}
            >
              Deactivate
            </Button>
          </div>
        </div>
      ) : null}

      {loading && data.items.length === 0 ? (
        <div className="grid gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <AgentDataTable
          columns={columns}
          data={data.items}
          getRowId={(agent) => agent.id}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          emptyMessage={error ?? "No agents match these filters."}
          mobileCardRenderer={({ row, selected, onToggleSelected }) => (
            <AgentMobileCard
              agent={row}
              selected={selected}
              onToggleSelected={onToggleSelected}
              onUpdated={updateAgentInList}
              onDeleted={deleteAgentFromList}
              onRefresh={() => void refreshList()}
            />
          )}
        />
      )}

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{loading ? "Loading..." : `${data.total} matching agents`}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
          >
            Next
          </Button>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
