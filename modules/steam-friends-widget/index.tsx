import { useEffect, useMemo, useState } from "react";
import { Circle, Gamepad2, Loader2, UsersRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SHARED_NAMESPACES } from "@/contexts/shared-namespaces";
import { useSharedContext } from "@/hooks/useSharedContext";
import { cn } from "@/lib/utils";
import {
  WidgetContent,
  WidgetHeader,
  WidgetSection,
  WidgetShell,
  WidgetState,
  WidgetStatus,
} from "@/modules/ui/WidgetShell";
import {
  steamService,
  type SteamFriend,
  type SteamFriendsPresence,
} from "@/services/steam";

const ACCENT = "slate" as const;

const EMPTY_PRESENCE: SteamFriendsPresence = {
  provider: { status: "disconnected" },
  profile: {},
  friends: [],
  onlineCount: 0,
  playingCount: 0,
  totalFriends: 0,
  inspectedCount: 0,
};

const STATUS_DOT: Record<string, string> = {
  online: "text-emerald-500",
  busy: "text-rose-500",
  away: "text-amber-500",
  snooze: "text-muted-foreground",
  looking_to_trade: "text-sky-500",
  looking_to_play: "text-violet-500",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatStatusLabel(label: string) {
  return label.replaceAll("_", " ");
}

export function SteamFriendsView({
  title,
  presence,
  loading,
  error,
  maxItems = 6,
}: {
  title: string;
  presence: SteamFriendsPresence;
  loading: boolean;
  error: string | null;
  maxItems?: number;
}) {
  const onlineFriends = useMemo(
    () =>
      presence.friends
        .filter((friend) => friend.personaState > 0)
        .slice(0, maxItems),
    [maxItems, presence.friends],
  );
  const message =
    error ?? presence.error ?? presence.provider?.lastError ?? null;
  const hasOnlineFriends = onlineFriends.length > 0;

  return (
    <WidgetShell accent={ACCENT}>
      <WidgetHeader
        accent={ACCENT}
        icon={<UsersRound className="size-4" />}
        title={title}
        description="Online friends and current games"
        status={
          presence.playingCount > 0 ? (
            <WidgetStatus tone="success">
              {presence.playingCount} playing
            </WidgetStatus>
          ) : (
            <WidgetStatus tone={hasOnlineFriends ? "info" : "neutral"}>
              {presence.onlineCount} online
            </WidgetStatus>
          )
        }
      />
      <WidgetContent className="flex flex-col">
        {loading && !hasOnlineFriends ? (
          <WidgetState
            accent={ACCENT}
            icon={<Loader2 className="size-5 animate-spin" />}
            title="Loading Steam friends"
            message="Checking who is online right now."
          />
        ) : !hasOnlineFriends ? (
          <WidgetState
            accent={ACCENT}
            icon={<UsersRound className="size-5" />}
            title="No friends online"
            message={message || "No connected Steam friends were found."}
          />
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1.5">
              {onlineFriends.map((friend) => (
                <SteamFriendRow key={friend.steamId} friend={friend} />
              ))}
            </div>
          </ScrollArea>
        )}
      </WidgetContent>
    </WidgetShell>
  );
}

function SteamFriendRow({ friend }: { friend: SteamFriend }) {
  const dotClass =
    STATUS_DOT[friend.personaStateLabel] ?? "text-muted-foreground";

  return (
    <WidgetSection accent={ACCENT} className="flex items-center gap-2 p-1.5">
      <Avatar className="size-8 border border-border/60">
        {friend.avatarUrl ? (
          <AvatarImage src={friend.avatarUrl} alt={friend.personaName} />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {initials(friend.personaName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Circle className={cn("size-2.5 shrink-0 fill-current", dotClass)} />
          <p className="truncate text-[0.82rem] font-semibold leading-tight">
            {friend.personaName}
          </p>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          {friend.game ? (
            <>
              <Gamepad2 className="size-3 shrink-0" />
              <span className="truncate">{friend.game.name}</span>
            </>
          ) : (
            <span className="truncate">
              {formatStatusLabel(friend.personaStateLabel)}
            </span>
          )}
        </div>
      </div>
    </WidgetSection>
  );
}

export default function SteamFriendsWidget({
  config,
}: {
  config: Record<string, unknown>;
}) {
  const title = String(config["title"] ?? "Steam Friends");
  const pollMs = Math.max(15000, Number(config["pollMs"] ?? 60000));
  const maxItems = Math.max(1, Math.min(12, Number(config["maxItems"] ?? 6)));
  const maxFriendsToInspect = Math.max(
    10,
    Math.min(500, Number(config["maxFriendsToInspect"] ?? 200)),
  );
  const { setShared } = useSharedContext();
  const [presence, setPresence] =
    useState<SteamFriendsPresence>(EMPTY_PRESENCE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextPresence = await steamService.getFriendsPresence({
          limit: maxItems,
          maxFriendsToInspect,
        });
        if (cancelled) return;
        setPresence(nextPresence);
        setError(null);
        setShared(SHARED_NAMESPACES.providerSteamFriends, nextPresence);
      } catch (nextError) {
        if (cancelled) return;
        setError(
          (nextError as Error)?.message ?? "Steam friends unavailable.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const intervalId = window.setInterval(() => void load(), pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [maxFriendsToInspect, maxItems, pollMs, setShared]);

  return (
    <SteamFriendsView
      title={title}
      presence={presence}
      loading={loading}
      error={error}
      maxItems={maxItems}
    />
  );
}
