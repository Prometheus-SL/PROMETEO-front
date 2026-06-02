import { io, type Socket } from "socket.io-client";

import { API_URL, api } from "@/lib/api";
import { ACCESS_TOKEN_KEY } from "@/services/auth-storage";

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

export type HermesMediaState = {
  available?: boolean;
  sourceAppId?: string;
  sourceAppName?: string;
  provider?: string;
  canonicalUrl?: string;
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  playbackStatus?: string;
  positionMs?: number;
  durationMs?: number;
  canPlay?: boolean;
  canPause?: boolean;
  canNext?: boolean;
  canPrevious?: boolean;
  detectedVia?: string;
  queued?: boolean;
  queuedCommandId?: string | null;
};

export type HermesMediaSnapshot = {
  id?: string;
  agentId: string;
  dataType: "media_update" | string;
  schemaVersion?: number;
  sampledAt?: string;
  timestamp?: string;
  mode?: string;
  error?: string | null;
  media?: HermesMediaState | null;
};

export type HermesAgentDataSnapshot = HermesSnapshot | HermesMediaSnapshot;

// Snapshot de presencia que el backend envía al identificarse el frontend (evento `agents-status`).
export type HermesAgentPresence = {
  agentId: string;
  userId?: string;
  connectedAt?: string;
  mode?: string;
};

export type HermesCommandResult = {
  commandId?: string;
  agentId: string;
  success: boolean;
  result?: {
    audio?: HermesSnapshot["audio"];
    media?: HermesMediaState | null;
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

type LatestDataResponse<TData = HermesAgentDataSnapshot> = {
  latest: Array<{
    _id: string;
    agentId: string;
    data: TData;
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

export async function getLatestAgentData<TData extends HermesAgentDataSnapshot>(
  agentId: string,
  dataType: string
): Promise<TData | null> {
  const query = new URLSearchParams({
    agentId,
    limit: "1",
    dataType,
  });

  const res = await api.get<ApiSuccess<LatestDataResponse<TData>> | ApiFailure>(
    `/api/v1/data/latest?${query.toString()}`
  );

  if (!res || ("success" in res && !res.success)) {
    throw new Error(
      getErrorMessage(
        res as ApiFailure,
        `No se pudo obtener el ultimo estado ${dataType} del agente`
      )
    );
  }

  const latestRecord = (res as ApiSuccess<LatestDataResponse<TData>>).data.latest[0];
  if (!latestRecord) return null;

  return {
    ...latestRecord.data,
    id: latestRecord._id,
    agentId: latestRecord.agentId,
    timestamp: latestRecord.createdAt,
  } as TData;
}

export async function getLatestSystemStatus(
  agentId: string
): Promise<HermesSnapshot | null> {
  return getLatestAgentData<HermesSnapshot>(agentId, "system_status");
}

export async function getLatestMediaStatus(
  agentId: string
): Promise<HermesMediaSnapshot | null> {
  return getLatestAgentData<HermesMediaSnapshot>(agentId, "media_update");
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
  onAgentData?: (snapshot: HermesAgentDataSnapshot) => void;
  onAgentsStatus?: (agents: HermesAgentPresence[]) => void;
  onAgentConnected?: (payload: { agentId: string }) => void;
  onAgentDisconnected?: (payload: { agentId: string }) => void;
  onCommandResult?: (payload: HermesCommandResult) => void;
  onError?: (message: string) => void;
}): Socket | null {
  // Se lee fresco en cada uso: el access token se rota al refrescar (lib/api.ts),
  // así que NO debe capturarse una sola vez o las reconexiones usarían un token caduco.
  const getToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!getToken()) return null;

  const socket = io(getSocketBaseUrl(), {
    // `auth` como función => socket.io la reevalúa en cada (re)conexión con el token actual.
    auth: (cb) => cb({ token: getToken() ?? "" }),
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect", () => {
    socket.emit("identify", {
      type: "frontend",
      token: getToken(),
    });
  });

  socket.on("agent-data", (payload: HermesAgentDataSnapshot) => {
    handlers.onAgentData?.(payload);
  });

  // Presencia inicial: el backend la envía al identificarse (también tras cada reconexión).
  socket.on("agents-status", (payload: HermesAgentPresence[]) => {
    handlers.onAgentsStatus?.(Array.isArray(payload) ? payload : []);
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
