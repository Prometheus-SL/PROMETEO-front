import { useCallback, useEffect, useMemo, useState } from "react";
import {
  agentsService,
  type Agent,
  type ServerStats,
  type LatestDataItem,
} from "@/services/agents";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PagedAgents = {
  items: Agent[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AgentsPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [query, setQuery] = useState("");
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
      const res = await agentsService.list({ query, page, pageSize });
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo cargar la lista de agentes");
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  async function refreshStats() {
    try {
      const s = await agentsService.stats();
      setStats(s);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron obtener las estadísticas");
    }
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Agentes online</CardTitle>
            <CardDescription>Actualmente conectados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{online}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total agentes</CardTitle>
            <CardDescription>Registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {stats?.agentsTotal ?? data.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Total usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {stats?.usersTotal ?? "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Última ingesta</CardTitle>
            <CardDescription>Fecha del último dato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-balance text-wrap leading-tight">
              {stats?.lastIngestionAt
                ? new Date(stats.lastIngestionAt).toLocaleString()
                : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por id/nombre/tag..."
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            className="w-72"
          />
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setPage(1);
            }}
          >
            Limpiar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <RegisterAgentDialog
            onRegistered={() => {
              void refreshList();
              void refreshStats();
            }}
          />
          <SendCommandDialog
            agents={Array.isArray(data?.items) ? data.items : []}
            onSent={() => toast.success("Comando enviado")}
          />
          <Button variant="secondary" onClick={() => void refreshStats()}>
            Refrescar stats
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Última conexión</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!Array.isArray(data?.items) || data.items.length === 0) &&
            !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              (Array.isArray(data?.items) ? data.items : []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.id}</TableCell>
                  <TableCell>{a.name || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        a.status === "online"
                          ? "text-green-600 dark:text-green-400"
                          : a.status === "offline"
                          ? "text-muted-foreground"
                          : ""
                      }
                    >
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell>{a.ip || "-"}</TableCell>
                  <TableCell>
                    {a.lastSeen ? new Date(a.lastSeen).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <AgentDataDialog agentId={a.id} />
                      <AgentPatchDialog
                        agent={a}
                        onSaved={(updated) => {
                          setData((prev) => ({
                            ...prev,
                            items: prev.items.map((it) =>
                              it.id === updated.id ? updated : it
                            ),
                          }));
                          void refreshList();
                        }}
                      />
                      <SendCommandDialog
                        agents={[a]}
                        label="Comando"
                        defaultAgentId={a.id}
                        onSent={() => toast.success("Comando enviado")}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación simple */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {loading ? "Cargando..." : `${data.total} resultados`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm">
            Página {page} de {pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Siguiente
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
                {n} / pág
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function RegisterAgentDialog({ onRegistered }: { onRegistered?: () => void }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = id.trim().length > 0 && !submitting;

  async function onSubmit() {
    setSubmitting(true);
    try {
      await agentsService.registerAgent({
        id: id.trim(),
        name: name.trim() || undefined,
        tags: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      toast.success("Agente registrado");
      setOpen(false);
      setId("");
      setName("");
      setTags("");
      onRegistered?.();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo registrar el agente");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Registrar agente</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar nuevo agente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="agent-id">ID del agente</Label>
            <Input
              id="agent-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="uuid-o-identificador"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-name">Nombre</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="opcional"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-tags">Tags</Label>
            <Input
              id="agent-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2 (opcional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {submitting ? "Guardando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendCommandDialog({
  agents = [],
  defaultAgentId,
  onSent,
  label = "Enviar comando",
}: {
  agents?: Agent[];
  defaultAgentId?: string;
  onSent?: () => void;
  label?: string;
}) {
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
        toast.error("El comando es obligatorio");
        setSubmitting(false);
        return;
      }
      await agentsService.sendCommand(payload);
      toast.success("Comando enviado");
      setOpen(false);
      setCommand("");
      onSent?.();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo enviar el comando");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{label}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Enviar comando a agentes</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="agent-select">Destino</Label>
            <select
              id="agent-select"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={agentId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setAgentId(e.target.value as "all" | string)
              }
            >
              <option value="all">Todos los agentes</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ? `${a.name} (${a.id})` : a.id}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="agent-command">Comando</Label>
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
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentDataDialog({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LatestDataItem[] | null>(null);

  async function ensureData() {
    if (items) return;
    setLoading(true);
    try {
      const response = await agentsService.getAgentData(agentId);
      setItems(response.records);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void ensureData();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Datos</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Últimos datos del agente</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading && (
            <p className="p-2 text-sm text-muted-foreground">Cargando...</p>
          )}
          {!loading && (!items || items.length === 0) && (
            <p className="p-2 text-sm text-muted-foreground">
              Sin datos recientes
            </p>
          )}
          {!loading &&
            items &&
            items.map((it, idx) => (
              <div key={idx} className="border-b p-2 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(it.createdAt).toLocaleString()}</span>
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900">
                    {it.dataType}
                  </span>
                </div>
                {it.tags && it.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {it.tags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">
                  {JSON.stringify(it.data.data, null, 2)}
                </pre>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentPatchDialog({
  agent,
  onSaved,
}: {
  agent: Agent;
  onSaved?: (agent: Agent) => void;
}) {
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
      toast.success("Agente actualizado");
      setOpen(false);
      onSaved?.(updated);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el agente");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Editar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Actualizar agente</DialogTitle>
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
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function safeParseJSON(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text; // deja pasar string si no es JSON válido
  }
}
