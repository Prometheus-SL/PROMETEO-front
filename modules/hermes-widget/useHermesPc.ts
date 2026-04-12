import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import {
  connectHermesSocket,
  getLatestSystemStatus,
  listMyHermesAgents,
  resolveAutoAgent,
  type HermesAgent,
  type HermesCommandResult,
  type HermesSnapshot,
  type HermesWidgetConfig,
  sendHermesCommand,
} from "./hermes-service";

type HermesWidgetState = {
  loading: boolean;
  error: string | null;
  agent: HermesAgent | null;
  snapshot: HermesSnapshot | null;
  pendingCommandId: string | null;
  lastCommandResult: HermesCommandResult | null;
};

function pickAgent(agents: HermesAgent[], config: HermesWidgetConfig) {
  if (config.mode === "agent" && config.agentId) {
    return agents.find((agent) => agent.agentId === config.agentId) || null;
  }

  return resolveAutoAgent(agents);
}

export function useHermesPc(config: HermesWidgetConfig) {
  const mode = config.mode ?? "auto";
  const explicitAgentId = config.agentId ?? "";
  const refreshFallbackMs = Math.max(
    5000,
    Number(config.refreshFallbackMs ?? 30000)
  );

  const [state, setState] = useState<HermesWidgetState>({
    loading: true,
    error: null,
    agent: null,
    snapshot: null,
    pendingCommandId: null,
    lastCommandResult: null,
  });
  const selectedAgentIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingCommandIdRef = useRef<string | null>(null);

  const reload = useCallback(
    async (keepLoading = false) => {
      if (!keepLoading) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
      }

      try {
        const agents = await listMyHermesAgents();
        const selectedAgent = pickAgent(agents, {
          mode,
          agentId: explicitAgentId,
        });
        selectedAgentIdRef.current = selectedAgent?.agentId || null;

        if (!selectedAgent) {
          setState({
            loading: false,
            error: null,
            agent: null,
            snapshot: null,
            pendingCommandId: null,
            lastCommandResult: null,
          });
          return;
        }

        const snapshot = await getLatestSystemStatus(selectedAgent.agentId);
        setState({
          loading: false,
          error: null,
          agent: selectedAgent,
          snapshot,
          pendingCommandId: pendingCommandIdRef.current,
          lastCommandResult: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el estado de Hermes",
        }));
      }
    },
    [explicitAgentId, mode]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void reload(true);
    }, refreshFallbackMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshFallbackMs, reload]);

  useEffect(() => {
    socketRef.current?.disconnect();
    socketRef.current = connectHermesSocket({
      onAgentData: (snapshot) => {
        const currentAgentId = selectedAgentIdRef.current;
        if (!currentAgentId) return;
        if (snapshot.dataType !== "system_status") return;

        if (snapshot.agentId === currentAgentId) {
          setState((prev) => ({
            ...prev,
            snapshot,
            agent: prev.agent
              ? {
                  ...prev.agent,
                  status: "online",
                  lastSeen: snapshot.timestamp || snapshot.sampledAt,
                  lastData: snapshot.timestamp || snapshot.sampledAt,
                }
              : prev.agent,
          }));
          return;
        }

        if (mode !== "agent") {
          void reload(true);
        }
      },
      onAgentConnected: ({ agentId }) => {
        if (mode !== "agent" || agentId === selectedAgentIdRef.current) {
          void reload(true);
        }
      },
      onAgentDisconnected: ({ agentId }) => {
        if (agentId === selectedAgentIdRef.current) {
          setState((prev) => ({
            ...prev,
            agent: prev.agent ? { ...prev.agent, status: "offline" } : prev.agent,
          }));
        }

        if (mode !== "agent") {
          void reload(true);
        }
      },
      onCommandResult: (result) => {
        if (result.agentId !== selectedAgentIdRef.current) {
          return;
        }

        if (pendingCommandIdRef.current && result.commandId === pendingCommandIdRef.current) {
          pendingCommandIdRef.current = null;
        }

        setState((prev) => ({
          ...prev,
          pendingCommandId:
            prev.pendingCommandId && prev.pendingCommandId === result.commandId
              ? null
              : prev.pendingCommandId,
          lastCommandResult: result,
          error: result.success ? null : result.error || prev.error,
          snapshot:
            result.result?.audio && prev.snapshot
              ? {
                  ...prev.snapshot,
                  audio: result.result.audio,
                }
              : prev.snapshot,
        }));
      },
      onError: (message) => {
        setState((prev) => ({ ...prev, error: message }));
      },
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [mode, reload]);

  return {
    ...state,
    reload,
    async sendCommand(command: string, parameters?: Record<string, unknown>) {
      const currentAgentId = selectedAgentIdRef.current;
      if (!currentAgentId) {
        throw new Error("No hay un agente Hermes seleccionado");
      }

      const response = await sendHermesCommand({
        agentId: currentAgentId,
        command,
        parameters,
      });

      pendingCommandIdRef.current = response.commandId || null;
      setState((prev) => ({
        ...prev,
        pendingCommandId: response.commandId || null,
        lastCommandResult: null,
        error: null,
      }));

      return response;
    },
  };
}
