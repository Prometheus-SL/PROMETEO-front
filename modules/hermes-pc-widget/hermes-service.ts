import { io, type Socket } from "socket.io-client";

import { API_URL, api } from "@/lib/api";
import { ACCESS_TOKEN_KEY } from "@/services/auth";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error?: string; message?: string };

export type HermesWidgetConfig = {
  mode?: "auto" | "agent";
  agentId?: string;
  title?: string;
  showDisks?: boolean;
  refreshFallbackMs?: number;
};

export type HermesAgent = {
  _id: string;
  agentId: string;
  name?: string;
  status: string;
  lastSeen?: string;
  lastData?: string;
  updatedAt?: string;
  computerInfo?: {
    hostname?: string;
    os?: {
      platform?: string;
      release?: string;
      arch?: string;
    };
    network?: {
      ip?: string;
    };
  };
};

export type HermesSnapshot = {
  id?: string;
  agentId: string;
  dataType: "system_status" | string;
  schemaVersion?: number;
  sampledAt?: string;
  timestamp?: string;
  mode?: string;
  system?: {
    hostname?: string;
    username?: string;
    uptimeSeconds?: number;
    os?: {
      platform?: string;
      release?: string;
      arch?: string;
    };
  };
  resources?: {
    cpu?: {
      model?: string;
      cores?: number;
      speedMHz?: number;
      percent?: number;
    };
    memory?: {
      totalBytes?: number;
      freeBytes?: number;
      usedBytes?: number;
      percent?: number;
    };
    disks?: Array<{
      drive?: string;
      totalBytes?: number;
      freeBytes?: number;
      usedBytes?: number;
      percent?: number;
    }>;
  };
  network?: {
    ip?: string;
    mac?: string;
    interfaces?: Array<{
      name?: string;
      address?: string;
      family?: string;
      internal?: boolean;
      mac?: string;
    }>;
  };
  audio?: {
    available?: boolean;
    volumePercent?: number;
    muted?: boolean;
    defaultOutputId?: string;
    defaultOutputName?: string;
    outputDevices?: Array<{
      id: string;
      name: string;
      index?: number;
      type?: string;
      isDefault?: boolean;
      isDefaultCommunication?: boolean;
    }>;
    error?: string | null;
  };
  tags?: string[];
};

export type HermesCommandResult = {
  commandId?: string;
  agentId: string;
  success: boolean;
  result?: {
    audio?: HermesSnapshot["audio"];
    [key: string]: unknown;
  } | null;
  error?: string | null;
  executionTime?: number;
  timestamp?: string;
};

type OwnAgentsResponse = {
  agents: HermesAgent[];
  total: number;
};

type LatestDataResponse = {
  latest: Array<{
    _id: string;
    agentId: string;
    data: HermesSnapshot;
    createdAt: string;
  }>;
  count: number;
  timestamp: string;
};

type SendCommandResponse = {
  commandId?: string;
  status?: string;
  priority?: string;
  scheduledFor?: string;
};

function getErrorMessage(response: ApiFailure | null | undefined, fallback: string) {
  return response?.error || response?.message || fallback;
}

function getSocketBaseUrl() {
  try {
    return new URL(API_URL, window.location.origin).origin;
  } catch (_error) {
    return API_URL;
  }
}

export async function listMyHermesAgents(): Promise<HermesAgent[]> {
  const res = await api.get<ApiSuccess<OwnAgentsResponse> | ApiFailure>(
    "/api/v1/agents/me"
  );

  if (!res || ("success" in res && !res.success)) {
    throw new Error(
      getErrorMessage(res as ApiFailure, "No se pudieron obtener tus agentes")
    );
  }

  return (res as ApiSuccess<OwnAgentsResponse>).data.agents;
}

export async function getLatestSystemStatus(
  agentId: string
): Promise<HermesSnapshot | null> {
  const query = new URLSearchParams({
    agentId,
    limit: "1",
    dataType: "system_status",
  });

  const res = await api.get<ApiSuccess<LatestDataResponse> | ApiFailure>(
    `/api/v1/data/latest?${query.toString()}`
  );

  if (!res || ("success" in res && !res.success)) {
    throw new Error(
      getErrorMessage(res as ApiFailure, "No se pudo obtener el ultimo estado del PC")
    );
  }

  const latestRecord = (res as ApiSuccess<LatestDataResponse>).data.latest[0];
  if (!latestRecord) return null;

  return {
    ...latestRecord.data,
    id: latestRecord._id,
    agentId: latestRecord.agentId,
    timestamp: latestRecord.createdAt,
  };
}

export function resolveAutoAgent(agents: HermesAgent[]): HermesAgent | null {
  if (agents.length === 0) return null;

  const scoreByAgent = [...agents].sort((left, right) => {
    const leftOnline = left.status === "online" ? 1 : 0;
    const rightOnline = right.status === "online" ? 1 : 0;
    if (leftOnline !== rightOnline) {
      return rightOnline - leftOnline;
    }

    const leftTimestamp = new Date(
      left.lastSeen || left.lastData || left.updatedAt || 0
    ).getTime();
    const rightTimestamp = new Date(
      right.lastSeen || right.lastData || right.updatedAt || 0
    ).getTime();

    return rightTimestamp - leftTimestamp;
  });

  return scoreByAgent[0] ?? null;
}

export function connectHermesSocket(handlers: {
  onAgentData?: (snapshot: HermesSnapshot) => void;
  onAgentConnected?: (payload: { agentId: string }) => void;
  onAgentDisconnected?: (payload: { agentId: string }) => void;
  onCommandResult?: (payload: HermesCommandResult) => void;
  onError?: (message: string) => void;
}): Socket | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  const socket = io(getSocketBaseUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => {
    socket.emit("identify", {
      type: "frontend",
      token,
    });
  });

  socket.on("agent-data", (payload: HermesSnapshot) => {
    handlers.onAgentData?.(payload);
  });

  socket.on("agent-connected", (payload: { agentId: string }) => {
    handlers.onAgentConnected?.(payload);
  });

  socket.on("agent-disconnected", (payload: { agentId: string }) => {
    handlers.onAgentDisconnected?.(payload);
  });

  socket.on("command-result", (payload: HermesCommandResult) => {
    handlers.onCommandResult?.(payload);
  });

  socket.on("error", (payload: { message?: string } | string) => {
    const message =
      typeof payload === "string" ? payload : payload?.message || "Socket error";
    handlers.onError?.(message);
  });

  socket.on("connect_error", (error) => {
    handlers.onError?.(error.message || "Socket connection error");
  });

  return socket;
}

export async function sendHermesCommand(payload: {
  agentId: string;
  command: string;
  parameters?: Record<string, unknown>;
}): Promise<SendCommandResponse> {
  const res = await api.post<ApiSuccess<SendCommandResponse> | ApiFailure>(
    "/control/command",
    {
      agentId: payload.agentId,
      command: payload.command,
      parameters: payload.parameters ?? {},
    }
  );

  if (!res || ("success" in res && !res.success)) {
    throw new Error(
      getErrorMessage(res as ApiFailure, "No se pudo enviar el comando Hermes")
    );
  }

  return (res as ApiSuccess<SendCommandResponse>).data;
}
