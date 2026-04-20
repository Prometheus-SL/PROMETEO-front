import { api } from "@/lib/api";

type BackendAgent = {
  _id: string;
  agentId?: string;
  name?: string;
  description?: string;
  status: "online" | "offline" | "idle" | string;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastSeen?: string;
  lastData?: string;
  user?: {
    _id: string;
    username: string;
    email?: string;
    surname?: string;
    name?: string;
  };
  computerInfo?: {
    hostname?: string;
    username?: string;
    os?: {
      platform?: string;
      release?: string;
      arch?: string;
    };
    hardware?: {
      cpu?: {
        model?: string;
        cores?: number;
        speed?: number;
      };
      memory?: {
        total?: number;
        available?: number;
      };
      storage?: Array<{
        drive?: string;
        total?: number;
        free?: number;
      }>;
    };
    network?: {
      ip?: string;
      mac?: string;
      interfaces?: string[];
    };
  };
  config?: {
    monitoringInterval?: number;
    allowedCommands?: unknown[];
    autoUpdate?: boolean;
    securityLevel?: string;
  };
  connectionInfo?: {
    connectedAt?: string;
    ipAddress?: string;
    socketId?: string;
  };
};

export type Agent = BackendAgent & {
  id: string;
  ip?: string;
  tags?: string[];
};

export type ServerStats = {
  server?: {
    uptime: number;
    memory: Record<string, number>;
    timestamp: string;
    version: string;
  };
  connections?: {
    total: number;
    agents: number;
    frontend: number;
  };
  database?: {
    totalAgents: number;
    activeAgents: number;
    totalUsers: number;
    totalData: number;
  };
  agentsOnline?: number;
  agentsTotal?: number;
};

export type AgentHealthItem = {
  agentId: string;
  name?: string;
  status: string;
  hostname?: string | null;
  lastSeen?: string | null;
  latestTelemetryAt?: string | null;
  health: {
    cpuPercent?: number | null;
    memoryPercent?: number | null;
    diskPercent?: number | null;
  };
  degraded: boolean;
};

export type AgentHealthResponse = {
  summary: {
    total: number;
    online: number;
    degraded: number;
  };
  agents: AgentHealthItem[];
};

export type LatestDataItem = {
  _id: string;
  agentId: string;
  data: Record<string, unknown>;
  dataType: string;
  priority: string;
  tags: string[];
  processed: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: {
    socketId?: string;
    ipAddress?: string;
  };
  agent?: {
    name?: string;
    agentId?: string;
    location?: string;
  } | null;
};

type AgentDataResponse = {
  latest: LatestDataItem[];
  count: number;
  timestamp: string;
};

type AgentSpecificDataResponse = {
  agentId: string;
  records: LatestDataItem[];
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type AgentsListResponse = {
  agents: BackendAgent[];
  pagination: {
    current: number;
    pages: number;
    total: number;
  };
  connections: {
    total: number;
    sockets: unknown[];
  };
};

type OwnAgentsResponse = {
  agents: BackendAgent[];
  total: number;
};

export type RegisterAgentPayload = {
  id: string;
  name?: string;
  tags?: string[];
};

export type CommandPayload = {
  command: string;
  agentId?: string;
  args?: unknown;
};

function normalizeAgent(agent: BackendAgent): Agent {
  return {
    ...agent,
    id: agent.agentId || agent._id,
    ip: agent.connectionInfo?.ipAddress || agent.computerInfo?.network?.ip,
  };
}

export const agentsService = {
  async list(params?: {
    query?: string;
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<Paged<Agent>> {
    const q = new URLSearchParams();
    if (params?.query) q.set("search", params.query);
    if (params?.status) q.set("status", params.status);
    if (params?.page !== undefined) q.set("page", String(params.page));
    if (params?.pageSize !== undefined) q.set("limit", String(params.pageSize));

    const data = await api.getData<AgentsListResponse>(`/api/v1/agents${q.toString() ? `?${q.toString()}` : ""}`);
    return {
      items: data.agents.map(normalizeAgent),
      total: data.pagination.total,
      page: data.pagination.current,
      pageSize: params?.pageSize ?? (data.agents.length || 10),
    };
  },

  async listMine(): Promise<Agent[]> {
    const data = await api.getData<OwnAgentsResponse>("/api/v1/agents/me");
    return data.agents.map(normalizeAgent);
  },

  async getById(userId: string): Promise<BackendAgent[]> {
    return api.getData<BackendAgent[]>(`/api/v1/agents/${encodeURIComponent(userId)}`);
  },

  async stats(): Promise<ServerStats> {
    const data = await api.getData<ServerStats>("/api/v1/stats");
    return {
      ...data,
      agentsOnline:
        data.agentsOnline ?? data.database?.activeAgents ?? data.connections?.agents,
      agentsTotal: data.agentsTotal ?? data.database?.totalAgents,
    };
  },

  async health(limit = 20): Promise<AgentHealthResponse> {
    const query = new URLSearchParams({ limit: String(limit) });
    return api.getData<AgentHealthResponse>(
      `/api/v1/agents/health?${query.toString()}`,
    );
  },

  async sendCommand(
    payload: CommandPayload
  ): Promise<{ commandId?: string; status?: string }> {
    return api.postData<{ commandId?: string; status?: string }>("/control/command", {
      agentId: payload.agentId,
      command: payload.command,
      parameters: payload.args,
    });
  },

  async getLatestData(params?: {
    agentId?: string;
    limit?: number;
    dataType?: string;
  }): Promise<LatestDataItem[]> {
    const q = new URLSearchParams();
    if (params?.agentId) q.set("agentId", params.agentId);
    if (params?.limit !== undefined) q.set("limit", String(params.limit));
    if (params?.dataType) q.set("dataType", params.dataType);

    const data = await api.getData<AgentDataResponse>(
      `/api/v1/data/latest${q.toString() ? `?${q.toString()}` : ""}`
    );
    return data.latest;
  },

  async registerAgent(payload: RegisterAgentPayload): Promise<Agent> {
    const data = await api.postData<{ agent: BackendAgent }>("/api/v1/agents", {
      agentId: payload.id,
      name: payload.name || payload.id,
    });

    return normalizeAgent(data.agent);
  },

  async getAgentData(
    agentId: string,
    params?: { page?: number; pageSize?: number; dataType?: string }
  ): Promise<AgentSpecificDataResponse> {
    const q = new URLSearchParams();
    if (params?.page !== undefined) q.set("page", String(params.page));
    if (params?.pageSize !== undefined) q.set("limit", String(params.pageSize));
    if (params?.dataType) q.set("dataType", params.dataType);

    return api.getData<AgentSpecificDataResponse>(
      `/api/v1/agents/${encodeURIComponent(agentId)}/data${q.toString() ? `?${q.toString()}` : ""}`
    );
  },

  async updateAgent(agentId: string, patch: Partial<Agent>): Promise<Agent> {
    const data = await api.patchData<{ agent: BackendAgent }>(
      `/api/v1/agents/${encodeURIComponent(agentId)}`,
      patch
    );
    return normalizeAgent(data.agent);
  },

  // --- Batch operations ---
  async batchStatus(agentIds: string[], isActive: boolean): Promise<void> {
    await api.postData<null>("/api/v1/agents/batch/status", { agentIds, isActive });
  },
};
