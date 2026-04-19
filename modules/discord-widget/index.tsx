import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Circle,
  ExternalLink,
  HeadphoneOff,
  LogOut,
  MessagesSquare,
  Mic,
  MicOff,
  MonitorPlay,
  RefreshCcw,
  Video,
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
  type DiscordPermissions,
} from "@/services/discord"
import { accountService } from "@/services/account"

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
  const [linkedDiscordId, setLinkedDiscordId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<DiscordPermissions | null>(null)
  const canModerate = Boolean(
    permissions && (permissions.isAdmin || permissions.isOwner),
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const payload = await accountService.getAccount()
        if (cancelled) return
        const discord = payload.linkedAccounts?.discord
        setLinkedDiscordId(
          discord?.status === "connected" ? discord.id ?? null : null,
        )
      } catch {
        if (!cancelled) setLinkedDiscordId(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await discordService.getStatus()
      setBotConnected(status.connected)
      return status.connected
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error")
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
        setError(err instanceof Error ? err.message : "Error fetching server")
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
    if (!serverId || botConnected !== true) {
      setPermissions(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const perms = await discordService.getMyPermissions(serverId)
        if (!cancelled) setPermissions(perms)
      } catch {
        if (!cancelled) setPermissions(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [serverId, botConnected])

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
        setError(err instanceof Error ? err.message : "Could not disconnect the member")
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
        setError(err instanceof Error ? err.message : "Could not mute the member")
      }
    },
    [serverId, fetchGuild],
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

  const headerIcon = guildInfo?.icon ? (
    <img
      src={guildInfo.icon}
      alt={guildInfo.name}
      className="size-7 rounded-full object-cover"
    />
  ) : (
    <MessagesSquare className="size-5" />
  )
  const headerTitle = guildInfo?.name ?? "Discord"

  return (
    <WidgetShell accent={ACCENT}>
      <WidgetHeader
        accent={ACCENT}
        icon={headerIcon}
        title={headerTitle}
        status={headerStatus}
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg bg-background/80"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
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
          linkedDiscordId,
          canModerate,
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
  linkedDiscordId,
  canModerate,
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
  linkedDiscordId: string | null
  canModerate: boolean
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
        title="Bot not connected"
        message="Add the bot to a server to start using Discord."
        action={
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={onInvite}
          >
            <ExternalLink className="size-3.5" />
            Add bot
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
        title="No server"
        message="Set a serverId to display your Discord server."
        action={
          <Button
            type="button"
            size="sm"
            className="rounded-lg"
            onClick={onInvite}
          >
            <ExternalLink className="size-3.5" />
            Add to server
          </Button>
        }
      />
    )
  }

  if (error && !guildInfo) {
    const notInGuild = /servidor|server/i.test(error)
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
        title={notInGuild ? "Bot is not in the server" : "Could not connect"}
        message={
          notInGuild
            ? "Re-invite the bot to keep viewing this server."
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
                Reinvite
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
              Retry
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
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
      <ChannelList
        guild={guildInfo}
        linkedDiscordId={linkedDiscordId}
        canModerate={canModerate}
        onDisconnectVoice={onDisconnectVoice}
        onToggleMute={onToggleMute}
      />
      <MemberList guild={guildInfo} linkedDiscordId={linkedDiscordId} />
    </div>
  )
}

function YouBadge() {
  return (
    <span
      title="Your linked account"
      className="inline-flex shrink-0 items-center rounded bg-violet-500/20 px-1 py-[1px] text-[8px] font-bold uppercase tracking-wider text-violet-500"
    >
      You
    </span>
  )
}

function ChannelList({
  guild,
  linkedDiscordId,
  canModerate,
  onDisconnectVoice,
  onToggleMute,
}: {
  guild: DiscordGuildInfo
  linkedDiscordId: string | null
  canModerate: boolean
  onDisconnectVoice: (userId: string) => void
  onToggleMute: (userId: string, mute: boolean) => void
}) {
  const activeVoiceChannels = useMemo(
    () =>
      guild.channels.filter(
        (ch) => ch.type === "voice" && (ch.voiceMembers?.length ?? 0) > 0,
      ),
    [guild.channels],
  )

  return (
    <WidgetSection accent={ACCENT} className="flex min-h-0 flex-col p-0">
      <p className="border-b border-violet-500/15 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        In voice · {activeVoiceChannels.length}
      </p>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-1.5">
          {activeVoiceChannels.length === 0 ? (
            <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
              Nobody is in voice
            </p>
          ) : null}
          {activeVoiceChannels.map((ch) => {
              const connected = ch.voiceMembers ?? []
              return (
                <div key={ch.id} className="flex flex-col">
                  <div className="flex items-center gap-2 rounded-md px-2 py-2 text-[12px] text-muted-foreground">
                    <Volume2 className="size-4 shrink-0" />
                    <span className="flex-1 truncate font-medium">{ch.name}</span>
                    {connected.length > 0 ? (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {connected.length}
                      </span>
                    ) : null}
                  </div>
                  {connected.length > 0 ? (
                    <div className="ml-5 flex flex-col gap-1 border-l border-violet-500/20 pl-2">
                      {connected.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 rounded-lg bg-violet-500/5 px-2 py-1.5"
                        >
                          <img
                            src={m.avatar}
                            alt=""
                            className="size-7 rounded-full border border-violet-500/25"
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="flex items-center gap-1 truncate text-[12px] font-medium text-foreground">
                              <span className="truncate">{m.name}</span>
                              {linkedDiscordId && m.id === linkedDiscordId ? (
                                <YouBadge />
                              ) : null}
                            </span>
                            <div className="flex items-center gap-1">
                              {m.streaming ? (
                                <span
                                  title="Live"
                                  className="flex shrink-0 items-center gap-0.5 rounded bg-rose-500/15 px-1 py-[1px] text-[8px] font-semibold uppercase tracking-wider text-rose-500"
                                >
                                  <MonitorPlay className="size-2.5" />
                                  Live
                                </span>
                              ) : null}
                              {m.video ? (
                                <Video
                                  className="size-3 shrink-0 text-emerald-500"
                                  aria-label="Camera on"
                                />
                              ) : null}
                              {m.deafened ? (
                                <HeadphoneOff className="size-3 shrink-0 text-rose-500" />
                              ) : null}
                            </div>
                          </div>
                          {canModerate ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onToggleMute(m.id, !m.muted)}
                                aria-label={m.muted ? "Unmute" : "Mute"}
                                className={cn(
                                  "grid size-9 shrink-0 place-items-center rounded-lg border transition-colors active:scale-95",
                                  m.muted
                                    ? "border-rose-500/30 bg-rose-500/15 text-rose-500"
                                    : "border-violet-500/20 bg-background/60 text-muted-foreground hover:bg-violet-500/15 hover:text-foreground",
                                )}
                              >
                                {m.muted ? (
                                  <MicOff className="size-4" />
                                ) : (
                                  <Mic className="size-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onDisconnectVoice(m.id)}
                                aria-label="Disconnect from voice channel"
                                className="grid size-9 shrink-0 place-items-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-500 transition-colors hover:bg-rose-500/20 active:scale-95"
                              >
                                <LogOut className="size-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
        </div>
      </ScrollArea>
    </WidgetSection>
  )
}

function MemberList({
  guild,
  linkedDiscordId,
}: {
  guild: DiscordGuildInfo
  linkedDiscordId: string | null
}) {
  const activeMembers = useMemo(() => {
    const members = guild.members.filter((m) => m.status !== "offline")
    if (!linkedDiscordId) return members
    return [...members].sort((a, b) => {
      if (a.id === linkedDiscordId) return -1
      if (b.id === linkedDiscordId) return 1
      return 0
    })
  }, [guild.members, linkedDiscordId])
  return (
    <WidgetSection accent={ACCENT} className="flex min-h-0 flex-col p-0">
      <p className="border-b border-violet-500/15 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Online · {activeMembers.length}
      </p>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 p-1.5">
          {activeMembers.map((member) => {
            const isYou =
              !!linkedDiscordId && member.id === linkedDiscordId
            return (
              <div
                key={member.id}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-violet-500/10",
                  isYou && "bg-violet-500/10 ring-1 ring-violet-500/30",
                )}
              >
                <Circle
                  className={cn(
                    "size-2.5 shrink-0 fill-current",
                    STATUS_DOT[member.status as MemberStatus] ?? STATUS_DOT.offline,
                  )}
                />
                <span className="flex min-w-0 flex-1 items-center gap-1 text-[12px] text-foreground">
                  <span className="truncate">{member.name}</span>
                  {isYou ? <YouBadge /> : null}
                </span>
              </div>
            )
          })}
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
