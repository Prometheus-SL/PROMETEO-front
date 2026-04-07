import { useCallback, useEffect, useMemo, useState } from "react";
import { agentsService, type Agent, type ServerStats } from "@/services/agents";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AgentDataTable } from "@/components/admin/agents/data-table";
import { buildAgentColumns } from "@/components/admin/agents/columns";
import { SendCommandDialog as AgentSendCommandDialog } from "@/components/admin/agents/send-command-dialog";

type PagedAgents = {
  items: Agent[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AgentsPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<PagedAgents>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Carga inicial
    void refreshStats();
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await agentsService.list({ page, pageSize });
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error("Error on loading agents list");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  async function refreshStats() {
    try {
      const s = await agentsService.stats();
      setStats(s);
    } catch (err) {
      console.error(err);
      toast.error("Error on loading agents stats");
    }
  }

  const columns = useMemo(
    () =>
      buildAgentColumns({
        onAgentUpdated: (updated: Agent) => {
          setData((prev) => ({
            ...prev,
            items: prev.items.map((item) =>
              item.id === updated.id ? updated : item
            ),
          }));
        },
        onRefreshList: refreshList,
      }),
    [refreshList]
  );

  const online = useMemo(() => {
    if (stats && typeof stats.agentsOnline === "number")
      return stats.agentsOnline;
    const maybeItems: unknown = (data as unknown as { items?: unknown })?.items;
    const items: Agent[] = Array.isArray(maybeItems)
      ? (maybeItems as Agent[])
      : [];
    return items.filter((a) => a && a.status === "online").length;
  }, [stats, data]);

  const pages = useMemo(
    () =>
      Math.max(1, Math.ceil((data.total || 0) / (data.pageSize || pageSize))),
    [data.total, data.pageSize, pageSize]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Online Agents</CardTitle>
            <CardDescription>Currently connected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{online}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Agents</CardTitle>
            <CardDescription>Registered in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {stats?.agentsTotal ?? data.total}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <AgentDataTable
        columns={columns}
        data={data.items || []}
        filtersComponent={
          <div className="flex items-center justify-end gap-2">
            <AgentSendCommandDialog
              agents={Array.isArray(data?.items) ? data.items : []}
              onSent={() => toast.success("Command sent")}
            >
              <Button variant="outline">Send Command</Button>
            </AgentSendCommandDialog>
            <Button variant="secondary" onClick={() => void refreshStats()}>
              Refresh stats
            </Button>
          </div>
        }
      />

      {/* Paginación simple */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${data.total} results`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm">
            Pages {page} of {pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </Button>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
