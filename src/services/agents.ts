import { api } from "@/lib/api";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: string; message?: string };

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

function getErrorMessage(response: ApiFailure | null | undefined, fallback: string) {
  return response?.error || response?.message || fallback;
}

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

    const url = `/api/v1/agents${q.toString() ? `?${q.toString()}` : ""}`;
    const res = await api.get<ApiSuccess<AgentsListResponse> | ApiFailure>(url);
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudo obtener la lista de agentes")
      );
    }

    const data = (res as ApiSuccess<AgentsListResponse>).data;
    return {
      items: data.agents.map(normalizeAgent),
      total: data.pagination.total,
      page: data.pagination.current,
      pageSize: params?.pageSize ?? (data.agents.length || 10),
    };
  },

  async listMine(): Promise<Agent[]> {
    const res = await api.get<ApiSuccess<OwnAgentsResponse> | ApiFailure>(
      "/api/v1/agents/me"
    );
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudieron obtener tus agentes")
      );
    }

    return (res as ApiSuccess<OwnAgentsResponse>).data.agents.map(normalizeAgent);
  },

  async getById(userId: string): Promise<BackendAgent[]> {
    const res = await api.get<ApiSuccess<BackendAgent[]> | ApiFailure>(
      `/api/v1/agents/${encodeURIComponent(userId)}`
    );
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudieron obtener los agentes del usuario")
      );
    }
    return (res as ApiSuccess<BackendAgent[]>).data;
  },

  async stats(): Promise<ServerStats> {
    const res = await api.get<ApiSuccess<ServerStats> | ApiFailure>("/api/v1/stats");
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudieron obtener las estadisticas")
      );
    }

    const data = (res as ApiSuccess<ServerStats>).data;
    return {
      ...data,
      agentsOnline:
        data.agentsOnline ?? data.database?.activeAgents ?? data.connections?.agents,
      agentsTotal: data.agentsTotal ?? data.database?.totalAgents,
    };
  },

  async sendCommand(
    payload: CommandPayload
  ): Promise<{ commandId?: string; status?: string }> {
    const res = await api.post<
      ApiSuccess<{ commandId?: string; status?: string }> | ApiFailure
    >("/control/command", {
      agentId: payload.agentId,
      command: payload.command,
      parameters: payload.args,
    });
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudo enviar el comando")
      );
    }
    return (res as ApiSuccess<{ commandId?: string; status?: string }>).data;
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

    const res = await api.get<ApiSuccess<AgentDataResponse> | ApiFailure>(
      `/api/v1/data/latest${q.toString() ? `?${q.toString()}` : ""}`
    );
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudo obtener el ultimo dato")
      );
    }
    return (res as ApiSuccess<AgentDataResponse>).data.latest;
  },

  async registerAgent(payload: RegisterAgentPayload): Promise<Agent> {
    const res = await api.post<
      ApiSuccess<{ agent: BackendAgent }> | ApiFailure
    >("/api/v1/agents", {
      agentId: payload.id,
      name: payload.name || payload.id,
    });
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudo registrar el agente")
      );
    }

    return normalizeAgent((res as ApiSuccess<{ agent: BackendAgent }>).data.agent);
  },

  async getAgentData(
    agentId: string,
    params?: { page?: number; pageSize?: number; dataType?: string }
  ): Promise<AgentSpecificDataResponse> {
    const q = new URLSearchParams();
    if (params?.page !== undefined) q.set("page", String(params.page));
    if (params?.pageSize !== undefined) q.set("limit", String(params.pageSize));
    if (params?.dataType) q.set("dataType", params.dataType);

    const url = `/api/v1/agents/${encodeURIComponent(agentId)}/data${
      q.toString() ? `?${q.toString()}` : ""
    }`;
    const res = await api.get<ApiSuccess<AgentSpecificDataResponse> | ApiFailure>(
      url
    );
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(
          res as ApiFailure,
          "No se pudieron obtener los datos del agente"
        )
      );
    }
    return (res as ApiSuccess<AgentSpecificDataResponse>).data;
  },

  async updateAgent(agentId: string, patch: Partial<Agent>): Promise<Agent> {
    const res = await api.patch<
      ApiSuccess<{ agent: BackendAgent }> | ApiFailure
    >(`/api/v1/agents/${encodeURIComponent(agentId)}`, patch);
    if (!res || ("success" in res && !res.success)) {
      throw new Error(
        getErrorMessage(res as ApiFailure, "No se pudo actualizar el agente")
      );
    }
    return normalizeAgent((res as ApiSuccess<{ agent: BackendAgent }>).data.agent);
  },
};
