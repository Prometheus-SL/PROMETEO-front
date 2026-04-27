import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Link2,
  Music2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Meteors } from "@/components/ui/meteors";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { discordService } from "@/services/discord";

type DiscordSummary = {
  guilds: number;
  botPresent: number;
  needsLink: boolean;
  needsReauth: boolean;
};

export default function DiscordInfoPage() {
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<DiscordSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [inviteResult, guildsResult] = await Promise.allSettled([
          discordService.getInviteUrl(),
          discordService.getMyGuilds(),
        ]);

        if (cancelled) return;

        setInviteUrl(inviteResult.status === "fulfilled" ? inviteResult.value : null);

        if (guildsResult.status === "fulfilled") {
          setSummary({
            guilds: guildsResult.value.guilds.length,
            botPresent: guildsResult.value.guilds.filter((guild) => guild.botPresent)
              .length,
            needsLink: Boolean(guildsResult.value.needsLink),
            needsReauth: Boolean(guildsResult.value.needsReauth),
          });
        } else {
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const coveragePercent = useMemo(() => {
    if (!summary || summary.guilds === 0) return 0;
    return Math.round((summary.botPresent / summary.guilds) * 100);
  }, [summary]);

  const isLinked = Boolean(summary && !summary.needsLink && !summary.needsReauth);

  return (
    <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-[#5865F2]/15 via-background to-[#22D3EE]/10 p-6 shadow-lg shadow-[#5865F2]/10 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0">
          <Meteors number={20} className="opacity-65" />
        </div>
        <div className="pointer-events-none absolute -left-24 top-6 h-48 w-48 rounded-full bg-[#5865F2]/25 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />

        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#5865F2] text-white hover:bg-[#5865F2]">
                Discord integration
              </Badge>
              <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
                Smart notifications + voice roadmap
              </Badge>
            </div>

            <div className="space-y-3">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Turn your server into a real-time operations feed.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Use Prometeo to publish free-game drops, release updates, and
                critical events directly to your Discord channels. Then expand
                into voice features, including a collaborative music player for
                voice rooms.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <HeroChip icon={BellRing} label="Real-time alerts" />
              <HeroChip icon={Workflow} label="Per-channel automation" />
              <HeroChip icon={Music2} label="Voice playback roadmap" />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="sm" className="h-9">
                <Link to="/discord/notifications">
                  Open notifications
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="h-9">
                <Link to="/account">Link account</Link>
              </Button>

              <Button
                asChild={Boolean(inviteUrl)}
                variant="outline"
                size="sm"
                className="h-9 border-[#5865F2]/40 bg-background/80"
                disabled={!inviteUrl}
              >
                {inviteUrl ? (
                  <a href={inviteUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 size-4" />
                    Invite bot
                  </a>
                ) : (
                  <span>Invite URL unavailable</span>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill
                active={isLinked}
                label={isLinked ? "Account linked" : "Account not linked"}
              />
              <StatusPill
                active={Boolean(summary && summary.botPresent > 0)}
                label={
                  summary
                    ? `Bot active in ${summary.botPresent}/${summary.guilds || 0} servers`
                    : "Bot coverage pending"
                }
              />
              <StatusPill
                active={!summary?.needsReauth}
                label={summary?.needsReauth ? "Re-auth required" : "Session authorized"}
              />
            </div>
          </div>

          <Card className="relative overflow-hidden border-border/70 bg-card/80 backdrop-blur-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-150">
            <BorderBeam
              size={84}
              duration={8}
              borderWidth={1.5}
              colorFrom="#5865F2"
              colorTo="#22D3EE"
            />
            <CardHeader>
              <CardDescription>Live status</CardDescription>
              <CardTitle className="text-xl">Integration health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Loading Discord status...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricTile
                      icon={Workflow}
                      label="Servers"
                      value={summary ? String(summary.guilds) : "--"}
                    />
                    <MetricTile
                      icon={Bot}
                      label="Bot installed"
                      value={
                        summary
                          ? `${summary.botPresent}/${summary.guilds || 0}`
                          : "--"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Server coverage</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {coveragePercent}%
                      </span>
                    </div>
                    <Progress value={coveragePercent} className="h-2" />
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <PhaseLine
                      done={isLinked}
                      text="Discord account connected"
                    />
                    <PhaseLine
                      done={Boolean(summary && summary.botPresent > 0)}
                      text="Bot present in at least one server"
                    />
                    <PhaseLine
                      done={Boolean(summary && !summary.needsReauth)}
                      text="Permissions ready for notification setup"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoBlock
          icon={BellRing}
          title="What you can do now"
          description="Automate channel updates without writing code."
          className="animate-in fade-in-0 slide-in-from-bottom-3 duration-700"
        >
          <FeatureRow
            icon={CheckCircle2}
            title="Epic Free Games"
            description="Automatic alerts when new free games drop."
          />
          <FeatureRow
            icon={CheckCircle2}
            title="Game updates"
            description="Track updates and releases for games you follow."
          />
          <FeatureRow
            icon={CheckCircle2}
            title="Artist releases"
            description="Notify channels about new albums and singles."
          />
        </InfoBlock>

        <InfoBlock
          icon={Activity}
          title="Recommended flow"
          description="Fast setup to make your server fully operational."
          className="animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-150"
        >
          <FeatureRow
            icon={Link2}
            title="1. Link account"
            description="Connect Discord from Account to grant access."
          />
          <FeatureRow
            icon={Bot}
            title="2. Invite Prometeo"
            description="Add the bot to your target servers."
          />
          <FeatureRow
            icon={BellRing}
            title="3. Define rules"
            description="Choose channel, notification type, and save."
          />
        </InfoBlock>

        <InfoBlock
          icon={Music2}
          title="Voice and music roadmap"
          description="Upcoming phase for richer voice channel experiences."
          className="animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-300"
        >
          <FeatureRow
            icon={Clock3}
            title="Voice room player"
            description="Control music playback directly in voice channels."
          />
          <FeatureRow
            icon={Sparkles}
            title="Collaborative queue"
            description="Allow members to add tracks in real time."
          />
          <FeatureRow
            icon={Workflow}
            title="Automation modes"
            description="Channel-level rules for music, alerts, and events."
          />
        </InfoBlock>
      </section>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}

function PhaseLine({ done, text }: { done: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex size-2 rounded-full transition-colors",
          done ? "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-muted",
        )}
      />
      <span className={done ? "text-foreground" : ""}>{text}</span>
    </div>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors",
        active
          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border bg-background/70 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          active ? "bg-emerald-400" : "bg-muted-foreground/50",
        )}
      />
      {label}
    </span>
  );
}

function HeroChip({
  icon: Icon,
  label,
}: {
  icon: typeof BellRing;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-[#5865F2]/35 hover:text-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Icon className="size-3.5 text-[#5865F2]" />
        {label}
      </span>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  description,
  className,
  children,
}: {
  icon: typeof BellRing;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-card/70 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-[#5865F2]" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CheckCircle2;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3 transition-all hover:-translate-y-0.5 hover:border-[#5865F2]/40">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-[#5865F2]" />
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}
