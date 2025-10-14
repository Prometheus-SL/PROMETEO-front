import { api } from "@/lib/api";

// Tipos base para respuestas
type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; message?: string };

// Tipos del backend
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
    user: {
        _id: string;
        username: string;
        email?: string;
        surname?: string;
        name?: string;
    };
    computerInfo?: {
        hardware?: { storage?: unknown[] };
        network?: { interfaces?: unknown[] };
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

// Tipo para la UI (con id obligatorio)
export type Agent = BackendAgent & {
    id: string;
    ip?: string;
    tags?: string[];
};

export type ServerStats = {
    agentsOnline: number;
    agentsTotal?: number;
    usersTotal?: number;
    dbCollections?: Record<string, number>;
    lastIngestionAt?: string;
};

export type LatestDataItem = {
    _id: string;
    agentId: string;
    data: {
        agentId: string;
        data: unknown;
        dataType: string;
        tags?: string[];
        timestamp?: number;
    };
    dataType: string;
    priority: string;
    tags: string[];
    processed: boolean;
    createdAt: string;
    updatedAt: string;
    metadata: {
        socketId: string;
        ipAddress: string;
    };
    agent?: unknown;
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

// Tipos específicos para la respuesta del backend de agentes
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

export type RegisterAgentPayload = {
    id: string;
    name?: string;
    tags?: string[];
};

export type CommandPayload = {
    command: string;
    agentId?: string; // si falta, se envía a todos
    args?: unknown;
};

export const agentsService = {
    // GET /agents?query=&page=&pageSize=
    async list(params?: { query?: string; page?: number; pageSize?: number }): Promise<Paged<Agent>> {
        const q = new URLSearchParams();
        if (params?.query) q.set("query", params.query);
        if (params?.page !== undefined) q.set("page", String(params.page));
        if (params?.pageSize !== undefined) q.set("pageSize", String(params.pageSize));
        const url = `/api/v1/agents${q.toString() ? `?${q.toString()}` : ""}`;
        const res = await api.get<ApiSuccess<AgentsListResponse> | ApiFailure>(url);
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudo obtener la lista de agentes";
            throw new Error(msg);
        }

        const data = (res as ApiSuccess<AgentsListResponse>).data;

        // Transformar la respuesta del backend al formato esperado por la UI
        const agents: Agent[] = data.agents.map(agent => ({
            ...agent,
            id: agent.agentId || agent._id, // Mapear agentId a id para compatibilidad
            ip: agent.connectionInfo?.ipAddress,
        }));

        return {
            items: agents,
            total: data.pagination.total,
            page: data.pagination.current,
            pageSize: Math.ceil(data.pagination.total / data.pagination.pages) || 10,
        };
    },

    // GET /agents/:userId
    async getById(userId: string): Promise<BackendAgent> {
        const res = await api.get<ApiSuccess<BackendAgent> | ApiFailure>(`/api/v1/agents/${encodeURIComponent(userId)}`);
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "Cant get agents for user";
            throw new Error(msg);
        }
        const agents = (res as ApiSuccess<BackendAgent>).data;
        return agents;
    },


    // GET /stats
    async stats(): Promise<ServerStats> {
        const res = await api.get<ApiSuccess<ServerStats> | ApiFailure>("/api/v1/stats");
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudieron obtener las estadísticas";
            throw new Error(msg);
        }
        return (res as ApiSuccess<ServerStats>).data;
    },

    // POST /agents/command
    async sendCommand(payload: CommandPayload): Promise<{ enqueued: number }> {
        const res = await api.post<ApiSuccess<{ enqueued: number }> | ApiFailure>("/api/v1/agents/command", payload);
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudo enviar el comando";
            throw new Error(msg);
        }
        return (res as ApiSuccess<{ enqueued: number }>).data;
    },

    // GET /data/latest
    async getLatestData(): Promise<LatestDataItem[]> {
        const res = await api.get<ApiSuccess<AgentDataResponse> | ApiFailure>("/api/v1/data/latest");
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudo obtener el último dato";
            throw new Error(msg);
        }
        return (res as ApiSuccess<AgentDataResponse>).data.latest;
    },

    // POST /agents
    async registerAgent(payload: RegisterAgentPayload): Promise<Agent> {
        const res = await api.post<ApiSuccess<Agent> | ApiFailure>("/api/v1/agents", payload);
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudo registrar el agente";
            throw new Error(msg);
        }
        return (res as ApiSuccess<Agent>).data;
    },

    // GET /agents/:agentId/data
    async getAgentData(agentId: string, params?: { page?: number; pageSize?: number }): Promise<AgentSpecificDataResponse> {
        const q = new URLSearchParams();
        if (params?.page !== undefined) q.set("page", String(params.page));
        if (params?.pageSize !== undefined) q.set("pageSize", String(params.pageSize));
        const url = `/api/v1/agents/${encodeURIComponent(agentId)}/data${q.toString() ? `?${q.toString()}` : ""}`;
        const res = await api.get<ApiSuccess<AgentSpecificDataResponse> | ApiFailure>(url);
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudieron obtener los datos del agente";
            throw new Error(msg);
        }
        return (res as ApiSuccess<AgentSpecificDataResponse>).data;
    },

    // PATCH /agents/:agentId
    async updateAgent(agentId: string, patch: Partial<Agent>): Promise<Agent> {
        const res = await api.patch<ApiSuccess<Agent> | ApiFailure>(`/api/v1/agents/${encodeURIComponent(agentId)}`, patch);
        if (!res || ("success" in res && !res.success)) {
            const msg = (res as ApiFailure)?.message || "No se pudo actualizar el agente";
            throw new Error(msg);
        }
        return (res as ApiSuccess<Agent>).data;
    },
};
