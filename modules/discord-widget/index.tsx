import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  Circle,
  ExternalLink,
  Hash,
  HeadphoneOff,
  LogOut,
  MessagesSquare,
  Mic,
  MicOff,
  RefreshCcw,
  Users,
  Volume2,
  WifiOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell"
import {
  discordService,
  type DiscordGuildInfo,
} from "@/services/discord"

const ACCENT = "violet" as const

type MemberStatus = "online" | "idle" | "dnd" | "offline"

const STATUS_DOT: Record<MemberStatus, string> = {
  online: "text-emerald-500",
  idle: "text-amber-500",
  dnd: "text-rose-500",
  offline: "text-muted-foreground",
}

export default function DiscordWidget({
  config,
}: {
  config: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}) {
  const serverId = String(config["serverId"] ?? "")

  const [guildInfo, setGuildInfo] = useState<DiscordGuildInfo | null>(null)
  const [botConnected, setBotConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await discordService.getStatus()
      setBotConnected(status.connected)
      return status.connected
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión")
      setBotConnected(false)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGuild = useCallback(
    async (id?: string) => {
      const targetId = id || serverId
      if (!targetId) return
      try {
        const info = await discordService.getGuildInfo(targetId)
        setGuildInfo(info)
        setError(null)
      } catch (err) {
        setGuildInfo(null)
        setError(err instanceof Error ? err.message : "Error obteniendo servidor")
      }
    },
    [serverId],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const connected = await fetchStatus()
      if (!cancelled && connected && serverId) {
        await fetchGuild()
      }
    })()
    return () => {
      cancelled = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!serverId || botConnected !== true) return
    const interval = window.setInterval(() => {
      void fetchGuild()
    }, 8000)
    return () => window.clearInterval(interval)
  }, [serverId, botConnected, fetchGuild])

  const handleInvite = async () => {
    try {
      const url = await discordService.getInviteUrl()
      window.open(url, "_blank")
    } catch {
      // Silently ignore — the invite URL endpoint may be missing
    }
  }

  const handleRefresh = useCallback(() => {
    void (async () => {
      const connected = await fetchStatus()
      if (connected && serverId) await fetchGuild()
    })()
  }, [fetchStatus, fetchGuild, serverId])

  const handleDisconnectVoice = useCallback(
    async (userId: string) => {
      if (!serverId) return
      try {
        await discordService.disconnectVoiceMember(serverId, userId)
        await fetchGuild()
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo expulsar al miembro")
      }
    },
    [serverId, fetchGuild],
  )

  const handleToggleMute = useCallback(
    async (userId: string, mute: boolean) => {
      if (!serverId) return
      try {
        await discordService.setVoiceMute(serverId, userId, mute)
        await fetchGuild()
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo mutear al miembro")
      }
    },
    [serverId, fetchGuild],
  )

  const onlineCount = useMemo(
    () =>
      guildInfo
        ? guildInfo.members.filter((m) => m.status !== "offline").length
        : 0,
    [guildInfo],
  )

  const headerStatus = (() => {
    if (loading && !guildInfo) return null
    if (error)
      return (
        <WidgetStatus tone="danger" icon={<WifiOff className="size-3" />}>
          Error
        </WidgetStatus>
      )
    if (botConnected === false)
      return (
        <WidgetStatus tone="warning" icon={<WifiOff className="size-3" />}>
          Offline
        </WidgetStatus>
      )
    if (guildInfo)
      return (
        <WidgetStatus tone="success" icon={<Circle className="size-2 fill-current" />}>
          Online
        </WidgetStatus>
      )
    return null
  })()

  const headerIcon = <MessagesSquare className="size-5" />
  const headerTitle = guildInfo?.name ?? "Discord"
  const headerDescription = guildInfo
    ? `${guildInfo.channels.length} canales`
    : "Servicio de comunidad"

  return (
    <WidgetShell accent={ACCENT}>
      <WidgetHeader
        accent={ACCENT}
        icon={headerIcon}
        title={headerTitle}
        description={headerDescription}
        status={headerStatus}
        meta={
          guildInfo ? (
            <WidgetStatus tone="info" icon={<Users className="size-3" />}>
              {onlineCount} online
            </WidgetStatus>
          ) : null
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg bg-background/80"
            onClick={handleRefresh}
            disabled={loading}
            title="Refrescar"
          >
            <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        }
      />

      <WidgetContent className="flex flex-col gap-2">
        {renderBody({
          loading,
          error,
          botConnected,
          guildInfo,
          serverId,
          onInvite: handleInvite,
          onRetry: handleRefresh,
          onDisconnectVoice: handleDisconnectVoice,
          onToggleMute: handleToggleMute,
        })}
      </WidgetContent>
    </WidgetShell>
  )
}

function renderBody({
  loading,
  error,
  botConnected,
  guildInfo,
  serverId,
  onInvite,
  onRetry,
  onDisconnectVoice,
  onToggleMute,
}: {
  loading: boolean
  error: string | null
  botConnected: boolean | null
  guildInfo: DiscordGuildInfo | null
  serverId: string
  onInvite: () => void
  onRetry: () => void
  onDisconnectVoice: (userId: string) => void
  onToggleMute: (userId: string, mute: boolean) => void
}): React.ReactNode {
  if (loading && !guildInfo && botConnected === null) {
    return <LoadingSkeleton />
  }

  if (botConnected === false) {
    return (
      <WidgetState
        accent={ACCENT}
        icon={<MessagesSquare className="size-5" />}
        title="Bot no conectado"
        message="Añade el bot a un servidor para empezar a usar Discord."
        action={
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={onInvite}
          >
            <ExternalLink className="size-3.5" />
            Añadir bot
          </Button>
        }
      />
    )
  }

  if (!serverId) {
    return (
      <WidgetState
        accent={ACCENT}
        icon={<MessagesSquare className="size-5" />}
        title="Sin servidor"
        message="Configura un serverId para mostrar tu servidor de Discord."
        action={
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={onInvite}
          >
            <ExternalLink className="size-3.5" />
            Añadir a servidor
          </Button>
        }
      />
    )
  }

  if (error && !guildInfo) {
    const notInGuild = /servidor/i.test(error)
    return (
      <WidgetState
        accent={notInGuild ? ACCENT : "rose"}
        tone={notInGuild ? "neutral" : "danger"}
        icon={
          notInGuild ? (
            <MessagesSquare className="size-5" />
          ) : (
            <WifiOff className="size-5" />
          )
        }
        title={notInGuild ? "Bot no está en el servidor" : "No se pudo conectar"}
        message={
          notInGuild
            ? "Vuelve a invitar al bot para seguir viendo este servidor."
            : error
        }
        action={
          <div className="flex gap-1.5">
            {notInGuild ? (
              <Button
                type="button"
                size="sm"
                className="rounded-lg"
                onClick={onInvite}
              >
                <ExternalLink className="size-3.5" />
                Reinvitar
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={onRetry}
            >
              <RefreshCcw className="size-3.5" />
              Reintentar
            </Button>
          </div>
        }
      />
    )
  }

  if (!guildInfo) {
    return <LoadingSkeleton />
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
      <ChannelList guild={guildInfo} onDisconnectVoice={onDisconnectVoice} />
      <MemberList guild={guildInfo} />
    </div>
  )
}

function ChannelList({
  guild,
  onDisconnectVoice,
}: {
  guild: DiscordGuildInfo
  onDisconnectVoice: (userId: string) => void
}) {
  const textChannels = useMemo(
    () => guild.channels.filter((ch) => ch.type === "text"),
    [guild.channels],
  )
  const voiceChannels = useMemo(
    () => guild.channels.filter((ch) => ch.type === "voice"),
    [guild.channels],
  )

  const [openText, setOpenText] = useState(true)
  const [openVoice, setOpenVoice] = useState(true)

  return (
    <WidgetSection accent={ACCENT} className="flex min-h-0 flex-col p-0">
      <p className="border-b border-violet-500/15 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Canales · {guild.channels.length}
      </p>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-1.5">
          <ChannelGroup
            label="Canal de texto"
            count={textChannels.length}
            open={openText}
            onToggle={() => setOpenText((v) => !v)}
          >
            {textChannels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-foreground"
              >
                <Hash className="size-3 shrink-0" />
                <span className="flex-1 truncate">{ch.name}</span>
              </div>
            ))}
          </ChannelGroup>

          <ChannelGroup
            label="Canal de voz"
            count={voiceChannels.length}
            open={openVoice}
            onToggle={() => setOpenVoice((v) => !v)}
          >
            {voiceChannels.map((ch) => {
              const connected = ch.voiceMembers ?? []
              return (
                <div key={ch.id} className="flex flex-col">
                  <div className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-foreground">
                    <Volume2 className="size-3 shrink-0" />
                    <span className="flex-1 truncate">{ch.name}</span>
                    {connected.length > 0 ? (
                      <span className="text-[9px] text-muted-foreground">
                        {connected.length}
                      </span>
                    ) : null}
                  </div>
                  {connected.length > 0 ? (
                    <div className="ml-4 flex flex-col gap-0.5 border-l border-violet-500/15 pl-2">
                      {connected.map((m) => (
                        <div
                          key={m.id}
                          className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-violet-500/10"
                        >
                          <img
                            src={m.avatar}
                            alt=""
                            className="size-4 rounded-full border border-violet-500/20"
                          />
                          <span className="flex-1 truncate text-[10px] text-foreground">
                            {m.name}
                          </span>
                          {m.muted ? (
                            <MicOff className="size-2.5 shrink-0 text-rose-500" />
                          ) : null}
                          {m.deafened ? (
                            <HeadphoneOff className="size-2.5 shrink-0 text-rose-500" />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onDisconnectVoice(m.id)}
                            title="Expulsar del canal de voz"
                            className="grid size-4 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-all hover:bg-rose-500/20 hover:text-rose-500 group-hover:opacity-100"
                          >
                            <LogOut className="size-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </ChannelGroup>
        </div>
      </ScrollArea>
    </WidgetSection>
  )
}

function ChannelGroup({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
        <span className="flex-1 truncate">{label}</span>
        <span className="text-muted-foreground/70">{count}</span>
      </button>
      {open ? <div className="mt-0.5 flex flex-col gap-0.5">{children}</div> : null}
    </div>
  )
}

function MemberList({ guild }: { guild: DiscordGuildInfo }) {
  return (
    <WidgetSection accent={ACCENT} className="flex min-h-0 flex-col p-0">
      <p className="border-b border-violet-500/15 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Miembros · {guild.members.length}
      </p>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {guild.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-violet-500/10"
            >
              <Circle
                className={cn(
                  "size-2 shrink-0 fill-current",
                  STATUS_DOT[member.status as MemberStatus] ?? STATUS_DOT.offline,
                )}
              />
              <span
                className={cn(
                  "truncate text-[11px]",
                  member.status === "offline"
                    ? "text-muted-foreground/60"
                    : "text-foreground",
                )}
              >
                {member.name}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </WidgetSection>
  )
}

function LoadingSkeleton() {
  return (
    <WidgetSection accent={ACCENT} className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full bg-violet-500/10" />
          <Skeleton className="h-3 flex-1 bg-violet-500/10" />
        </div>
      ))}
    </WidgetSection>
  )
}
