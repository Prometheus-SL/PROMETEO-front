import { useEffect, useState, useCallback } from "react"
import { Users, Volume2, Hash, Circle, ExternalLink, RefreshCw, ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  discordService,
  type DiscordGuild,
  type DiscordGuildInfo,
} from "@/services/discord"

const DISCORD_BLURPLE = "#5865F2"

function DiscordLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

type MemberStatus = "online" | "idle" | "dnd" | "offline"

function statusColor(status: MemberStatus) {
  switch (status) {
    case "online": return "text-green-400"
    case "idle": return "text-yellow-400"
    case "dnd": return "text-red-500"
    default: return "text-slate-500"
  }
}

export default function DiscordWidget({
  config,
  onConfigChange,
}: {
  config: Record<string, unknown>
  onConfigChange?: (config: Record<string, unknown>) => void
}) {
  const serverId = String(config["serverId"] ?? "")

  const [guilds, setGuilds] = useState<DiscordGuild[]>([])
  const [guildInfo, setGuildInfo] = useState<DiscordGuildInfo | null>(null)
  const [botConnected, setBotConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSelector, setShowSelector] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await discordService.getStatus()
      setBotConnected(status.connected)
      setGuilds(status.guilds)
      return status.connected
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión")
      setBotConnected(false)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGuild = useCallback(async (id?: string) => {
    const targetId = id || serverId
    if (!targetId) return
    setError(null)
    try {
      const info = await discordService.getGuildInfo(targetId)
      setGuildInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error obteniendo servidor")
    }
  }, [serverId])

  // Initial load: fetch status, then guild if serverId is set
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const connected = await fetchStatus()
      if (!cancelled && connected && serverId) {
        await fetchGuild()
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInvite = async () => {
    try {
      const url = await discordService.getInviteUrl()
      window.open(url, "_blank")
    } catch {
      window.open(
        `https://discord.com/oauth2/authorize?client_id=${botConnected ? "" : ""}&permissions=66560&scope=bot`,
        "_blank"
      )
    }
  }

  const selectGuild = (guild: DiscordGuild) => {
    onConfigChange?.({ ...config, serverId: guild.id })
    setShowSelector(false)
    fetchGuild(guild.id)
  }

  const onlineCount = guildInfo
    ? guildInfo.members.filter((m) => m.status !== "offline").length
    : 0

  // Setup screen: bot not connected or no server selected
  if (!serverId || !guildInfo) {
    return (
      <Card
        className={cn("relative h-full overflow-hidden flex flex-col")}
        style={{ backgroundColor: "#1e1f22" }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-white/10"
          style={{ backgroundColor: "#2b2d31" }}
        >
          <div
            className="grid size-7 place-items-center rounded-full text-white shrink-0"
            style={{ backgroundColor: DISCORD_BLURPLE }}
          >
            <DiscordLogo className="size-4" />
          </div>
          <span className="text-sm font-semibold text-slate-100 truncate flex-1">
            Discord
          </span>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div
            className="w-2/5 flex flex-col overflow-y-auto py-2 px-1 border-r border-white/10 shrink-0"
            style={{ backgroundColor: "#2b2d31" }}
          >
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Servidores
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="size-4 text-slate-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-4 px-2">
                <p className="text-[10px] text-red-400 text-center">{error}</p>
                <button
                  onClick={fetchStatus}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className="size-2.5" />
                  Reintentar
                </button>
              </div>
            ) : botConnected === false ? (
              <div className="flex flex-col items-center gap-2 py-4 px-2">
                <p className="text-[10px] text-slate-500 text-center">
                  Bot no conectado
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {guilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => selectGuild(guild)}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    {guild.icon ? (
                      <img
                        src={guild.icon}
                        alt=""
                        className="size-4 rounded-full shrink-0"
                      />
                    ) : (
                      <div
                        className="grid size-4 place-items-center rounded-full text-[7px] font-bold text-white shrink-0"
                        style={{ backgroundColor: DISCORD_BLURPLE }}
                      >
                        {guild.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs truncate flex-1">{guild.name}</span>
                    <span className="text-[10px] text-slate-500">{guild.memberCount}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
            {guilds.length > 0 ? (
              <>
                <DiscordLogo
                  className="size-8 opacity-20"
                  style={{ color: DISCORD_BLURPLE }}
                />
                <p className="text-xs text-slate-500 text-center">
                  Selecciona un servidor
                </p>
              </>
            ) : !loading && botConnected !== false ? (
              <>
                <DiscordLogo
                  className="size-8 opacity-20"
                  style={{ color: DISCORD_BLURPLE }}
                />
                <p className="text-xs text-slate-500 text-center">
                  El bot no está en ningún servidor
                </p>
                <button
                  onClick={handleInvite}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: DISCORD_BLURPLE }}
                >
                  <ExternalLink className="size-3" />
                  Añadir bot
                </button>
              </>
            ) : null}
            <div className="flex gap-2">
              <button
                onClick={handleInvite}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <ExternalLink className="size-2.5" />
                Añadir a servidor
              </button>
              <button
                onClick={fetchStatus}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RefreshCw className="size-2.5" />
                Refrescar
              </button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Connected view: show real server data
  return (
    <Card
      className={cn("relative h-full overflow-hidden flex flex-col")}
      style={{ backgroundColor: "#1e1f22" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-white/10"
        style={{ backgroundColor: "#2b2d31" }}
      >
        <div className="relative shrink-0">
          {guildInfo.icon ? (
            <img
              src={guildInfo.icon}
              alt=""
              className="size-7 rounded-full"
            />
          ) : (
            <div
              className="grid size-7 place-items-center rounded-full text-white text-xs font-bold"
              style={{ backgroundColor: DISCORD_BLURPLE }}
            >
              {guildInfo.name.charAt(0)}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex items-center gap-1 text-sm font-semibold text-slate-100 truncate flex-1 hover:text-white transition-colors"
        >
          <span className="truncate">{guildInfo.name}</span>
          <ChevronDown className="size-3 shrink-0 opacity-50" />
        </button>
        <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
          <Users className="size-3" />
          <span>{onlineCount}</span>
        </div>
      </div>

      {/* Server selector dropdown */}
      {showSelector && (
        <div
          className="absolute top-10 left-0 right-0 z-10 border-b border-white/10 p-1.5 flex flex-col gap-0.5"
          style={{ backgroundColor: "#2b2d31" }}
        >
          {guilds.map((guild) => (
            <button
              key={guild.id}
              onClick={() => selectGuild(guild)}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-1 text-xs text-left transition-colors",
                guild.id === serverId
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5"
              )}
            >
              {guild.icon ? (
                <img src={guild.icon} alt="" className="size-4 rounded-full" />
              ) : (
                <div
                  className="grid size-4 place-items-center rounded-full text-[7px] font-bold text-white"
                  style={{ backgroundColor: DISCORD_BLURPLE }}
                >
                  {guild.name.charAt(0)}
                </div>
              )}
              <span className="truncate">{guild.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Channel list */}
        <div
          className="w-2/5 flex flex-col gap-0.5 overflow-y-auto py-2 px-1 border-r border-white/10 shrink-0"
          style={{ backgroundColor: "#2b2d31" }}
        >
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Canales
          </p>
          {guildInfo.channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-1.5 rounded px-2 py-0.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer transition-colors"
            >
              {ch.type === "voice" ? (
                <Volume2 className="size-3 shrink-0" />
              ) : (
                <Hash className="size-3 shrink-0" />
              )}
              <span className="text-xs truncate flex-1">{ch.name}</span>
              {ch.type === "voice" && (ch.members ?? 0) > 0 && (
                <span className="text-[10px] text-slate-500">
                  {ch.members}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Member list */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto py-2 px-1">
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Miembros
          </p>
          {guildInfo.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-1.5 rounded px-2 py-0.5 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <Circle
                className={cn(
                  "size-2 shrink-0 fill-current",
                  statusColor(member.status)
                )}
              />
              <span
                className={cn(
                  "text-xs truncate",
                  member.status === "offline"
                    ? "text-slate-600"
                    : "text-slate-300"
                )}
              >
                {member.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
