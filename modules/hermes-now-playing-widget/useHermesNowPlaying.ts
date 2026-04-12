import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import { useSharedContext } from "@/hooks/useSharedContext";
import { SharedKeys, type MediaSession } from "@/types/shared";

import {
  connectHermesSocket,
  getLatestMediaStatus,
  listMyHermesAgents,
  resolveAutoAgent,
  sendHermesCommand,
  type HermesAgent,
  type HermesCommandResult,
  type HermesMediaSnapshot,
  type HermesWidgetConfig,
} from "../hermes-pc-widget/hermes-service";

type HermesNowPlayingState = {
  loading: boolean;
  error: string | null;
  agent: HermesAgent | null;
  mediaSnapshot: HermesMediaSnapshot | null;
  pendingCommandId: string | null;
  lastCommandResult: HermesCommandResult | null;
};

function pickAgent(agents: HermesAgent[], config: HermesWidgetConfig) {
  if (config.mode === "agent" && config.agentId) {
    return agents.find((agent) => agent.agentId === config.agentId) || null;
  }

  return resolveAutoAgent(agents);
}

export function useHermesNowPlaying(config: HermesWidgetConfig) {
  const mode = config.mode ?? "auto";
  const explicitAgentId = config.agentId ?? "";
  const refreshFallbackMs = Math.max(
    5000,
    Number(config.refreshFallbackMs ?? 15000)
  );
  const { setShared, getShared } = useSharedContext();

  const [state, setState] = useState<HermesNowPlayingState>({
    loading: true,
    error: null,
    agent: null,
    mediaSnapshot: null,
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
            mediaSnapshot: null,
            pendingCommandId: null,
            lastCommandResult: null,
          });
          return;
        }

        const mediaSnapshot = await getLatestMediaStatus(selectedAgent.agentId);
        setState({
          loading: false,
          error: null,
          agent: selectedAgent,
          mediaSnapshot,
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
              : "No se pudo cargar el estado multimedia de Hermes",
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
        if (snapshot.dataType !== "media_update") return;

        if (snapshot.agentId === currentAgentId) {
          setState((prev) => ({
            ...prev,
            mediaSnapshot: snapshot,
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

        if (
          pendingCommandIdRef.current &&
          result.commandId === pendingCommandIdRef.current
        ) {
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
          mediaSnapshot: result.result?.media
            ? {
                ...(prev.mediaSnapshot || {
                  agentId: result.agentId,
                  dataType: "media_update",
                  sampledAt: new Date().toISOString(),
                }),
                media: {
                  ...(prev.mediaSnapshot?.media || {}),
                  ...result.result.media,
                },
              }
            : prev.mediaSnapshot,
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

  useEffect(() => {
    const media = state.mediaSnapshot?.media;
    if (!media?.available || !media.title) {
      const current = getShared<MediaSession>(SharedKeys.MEDIA_SESSION);
      if (current?.source?.startsWith("hermes")) {
        setShared<MediaSession | null>(SharedKeys.MEDIA_SESSION, null);
      }
      return;
    }

    const nextSession: MediaSession = {
      title: media.title,
      artist: media.artist || media.sourceAppName || "Hermes media",
      album: media.album,
      artwork: media.artworkUrl,
      isPlaying: media.playbackStatus === "playing",
      source: `hermes:${media.provider || "browser"}`,
      provider: media.provider,
      sourceAppName: media.sourceAppName,
      canonicalUrl: media.canonicalUrl,
      timestamp: media.positionMs,
      duration: media.durationMs,
    };

    setShared<MediaSession>(SharedKeys.MEDIA_SESSION, nextSession);
  }, [getShared, setShared, state.mediaSnapshot]);

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
