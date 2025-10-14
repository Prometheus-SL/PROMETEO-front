import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  LayoutDashboard,
  Bot,
  Activity,
  ShieldCheck,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Meteors } from "@/components/ui/meteors";
import { useAuthContext } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { agentsService } from "@/services/agents";

function getRelativeTimeFromNow(value?: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const thresholds: Array<{
    limit: number;
    divisor: number;
    unit: Intl.RelativeTimeFormatUnit;
  }> = [
    { limit: 60, divisor: 1, unit: "second" },
    { limit: 3600, divisor: 60, unit: "minute" },
    { limit: 86400, divisor: 3600, unit: "hour" },
    { limit: 604800, divisor: 86400, unit: "day" },
    { limit: 2628000, divisor: 604800, unit: "week" },
    { limit: 31536000, divisor: 2628000, unit: "month" },
  ];

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const absDiff = Math.abs(diffSeconds);

  for (const { limit, divisor, unit } of thresholds) {
    if (absDiff < limit) {
      const valueInUnit = Math.round(diffSeconds / divisor);
      return rtf.format(-valueInUnit, unit);
    }
  }

  const years = Math.round(diffSeconds / 31536000);
  return rtf.format(-years, "year");
}

function getBirthdayInfo(birthday?: string) {
  if (!birthday) {
    return { nextBirthdayLabel: "No data", age: null as number | null };
  }

  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) {
    return { nextBirthdayLabel: "No data", age: null as number | null };
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const nextBirthday = new Date(birthDate);
  nextBirthday.setFullYear(currentYear);

  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }

  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const age =
    currentYear - birthDate.getFullYear() - (nextBirthday > today ? 1 : 0);

  if (diffDays === 0) {
    return { nextBirthdayLabel: "Happy birthday!", age };
  }

  return {
    nextBirthdayLabel: `In ${diffDays} day${diffDays === 1 ? "" : "s"}`,
    age,
  };
}

type AgentSummary = {
  total: number | null;
  online: number | null;
  owned: number | null;
  runningOwned: number | null;
  loading: boolean;
  error: string | null;
};

export default function HomePage() {
  const { user } = useAuthContext();
  const [agentSummary, setAgentSummary] = useState<AgentSummary>({
    total: null,
    online: null,
    owned: null,
    runningOwned: null,
    loading: true,
    error: null,
  });

  const userFullName = useMemo(() => {
    if (!user) return "";
    const fullName = [user.name, user.surname].filter(Boolean).join(" ");
    return fullName.trim() || user.username;
  }, [user]);

  const greeting = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 19) return "Good afternoon";
    return "Good evening";
  }, []);

  const lastLoginLabel = useMemo(
    () => getRelativeTimeFromNow(user?.lastLogin),
    [user?.lastLogin]
  );

  const birthdayInfo = useMemo(
    () => getBirthdayInfo(user?.birthday),
    [user?.birthday]
  );

  useEffect(() => {
    let active = true;

    async function fetchAgentSummary() {
      if (!user) {
        if (active) {
          setAgentSummary({
            total: null,
            online: null,
            owned: null,
            runningOwned: null,
            loading: false,
            error: null,
          });
        }
        return;
      }

      setAgentSummary((prev) => ({ ...prev, loading: true, error: null }));

      const ownerCandidates = [user.id, user.username, user.email]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());

      try {
        const [statsResult, listResult] = await Promise.allSettled([
          agentsService.stats(),
          agentsService.getById(user.id),
        ]);

        const stats =
          statsResult.status === "fulfilled" ? statsResult.value : null;
        const agentData =
          listResult.status === "fulfilled" ? listResult.value : null;

        const agents = Array.isArray(agentData)
          ? agentData
          : agentData
          ? [agentData]
          : [];

        let owned = 0;
        let runningOwned = 0;

        if (ownerCandidates.length > 0 && agents.length > 0) {
          agents.forEach((agent) => {
            if (!agent?.user) return;

            const identifiers = [
              agent.user.email,
              agent.user.username,
              agent.user.name,
              agent.user.surname,
              agent.agentId,
              agent._id,
            ]
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.toLowerCase());

            const matchesOwner = identifiers.some((identifier) =>
              ownerCandidates.some(
                (candidate) =>
                  identifier === candidate || identifier.includes(candidate)
              )
            );

            if (matchesOwner) {
              owned += 1;
              const status =
                typeof agent?.status === "string"
                  ? agent.status.toLowerCase()
                  : "";
              if (
                agent?.isOnline ||
                status === "online" ||
                status === "running"
              ) {
                runningOwned += 1;
              }
            }
          });
        }

        const statsError =
          statsResult.status === "rejected"
            ? statsResult.reason instanceof Error
              ? statsResult.reason.message
              : String(statsResult.reason ?? "Unknown error")
            : null;
        const agentsError =
          listResult.status === "rejected"
            ? listResult.reason instanceof Error
              ? listResult.reason.message
              : String(listResult.reason ?? "Unknown error")
            : null;

        if (active) {
          setAgentSummary({
            total: stats?.agentsTotal ?? null,
            online: stats?.agentsOnline ?? null,
            owned: ownerCandidates.length > 0 ? owned : null,
            runningOwned: ownerCandidates.length > 0 ? runningOwned : null,
            loading: false,
            error: agentsError ?? statsError,
          });
        }
      } catch (error) {
        if (active) {
          setAgentSummary({
            total: null,
            online: null,
            owned: null,
            runningOwned: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not retrieve agent information",
          });
        }
      }
    }

    void fetchAgentSummary();

    return () => {
      active = false;
    };
  }, [user, user?.email, user?.id, user?.username]);

  const heroStats = useMemo(() => {
    const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [
      {
        icon: ShieldCheck,
        label: "User",
        value: user?.username ?? "No session",
      },
      {
        icon: UserRound,
        label: "Active role",
        value: user?.role ?? "Guest",
      },
      {
        icon: CalendarClock,
        label: "Last access",
        value: lastLoginLabel,
      },
    ];

    const ownedValue = agentSummary.loading
      ? "Loading..."
      : agentSummary.owned !== null
      ? agentSummary.owned === 0
        ? "No agents"
        : `${agentSummary.owned}`
      : agentSummary.error
      ? "Not available"
      : agentSummary.total !== null
      ? `${agentSummary.total} global`
      : "No data";

    stats.push({
      icon: Bot,
      label: "Linked agents",
      value: ownedValue,
    });

    const runningValue = agentSummary.loading
      ? "Loading..."
      : agentSummary.runningOwned !== null
      ? agentSummary.runningOwned > 0
        ? `${agentSummary.runningOwned} active`
        : "None active"
      : agentSummary.online !== null
      ? `${agentSummary.online} globals`
      : agentSummary.error
      ? "Not available"
      : "No data";

    stats.push({
      icon: Activity,
      label: "Running agents",
      value: runningValue,
    });

    return stats;
  }, [
    agentSummary.error,
    agentSummary.loading,
    agentSummary.owned,
    agentSummary.online,
    agentSummary.runningOwned,
    agentSummary.total,
    lastLoginLabel,
    user?.role,
    user?.username,
  ]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background/60 to-transparent p-8 shadow-lg shadow-primary/5 lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <Meteors number={45} className="opacity-75" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
          <div className="space-y-8 mb-0">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">
                {greeting}
                {userFullName ? `, ${userFullName}` : ""}
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Controll your smart agents, deploy key modules, and monitor
                operation in a single place optimized for agile teams.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard">
                  <LayoutDashboard className="size-5" />
                  Go to dashboards
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/marketplace">
                  <Store className="size-5" />
                  Explore marketplace
                </Link>
              </Button>
              {user?.role?.toLowerCase() === "admin" && (
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="border border-border/60 bg-background/60"
                >
                  <Link to="/admin/users">
                    <ShieldCheck className="size-5" />
                    Admin panel
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {heroStats.map((stat) => (
                <HeroStat key={stat.label} {...stat} />
              ))}
            </div>
          </div>

          <Card className="bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Personal Summary</CardTitle>
              <CardDescription>
                Key information about your account and your participation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                <InfoRow label="Name" value={userFullName || "No data"} />
                <InfoRow label="Email" value={user?.email ?? "No data"} />
                <InfoRow label="Role" value={user?.role ?? "Unassigned"} />
                <InfoRow
                  label="Linked Agents"
                  value={
                    agentSummary.loading
                      ? "Loading..."
                      : agentSummary.owned !== null
                      ? agentSummary.owned === 0
                        ? "No agents"
                        : `${agentSummary.owned} agent${
                            agentSummary.owned === 1 ? "" : "s"
                          }`
                      : agentSummary.error
                      ? "Not available"
                      : "No data"
                  }
                />
                <InfoRow
                  label="Running Agents"
                  value={
                    agentSummary.loading
                      ? "Loading..."
                      : agentSummary.runningOwned !== null
                      ? agentSummary.runningOwned > 0
                        ? `${agentSummary.runningOwned} active${
                            agentSummary.runningOwned === 1 ? "" : "s"
                          }`
                        : "No active"
                      : agentSummary.online !== null
                      ? `${agentSummary.online} globals`
                      : agentSummary.error
                      ? "Not available"
                      : "No data"
                  }
                />
                <InfoRow
                  label="Next Birthday"
                  value={birthdayInfo.nextBirthdayLabel}
                />
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
                <p className="font-medium text-primary">
                  {userFullName
                    ? `Thanks for using Prometeo, ${userFullName}.`
                    : "Activate your account to get started."}
                </p>
                {!agentSummary.loading && agentSummary.error && (
                  <p className="text-xs text-destructive">
                    Could not load agent status: {agentSummary.error}
                  </p>
                )}
                {!agentSummary.loading &&
                  agentSummary.error === null &&
                  agentSummary.owned !== null && (
                    <p
                      className={cn(
                        "text-xs font-medium",
                        agentSummary.runningOwned &&
                          agentSummary.runningOwned > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : agentSummary.owned > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {agentSummary.owned === 0
                        ? "You have not registered any agents yet. Visit the agents section to register the first one."
                        : agentSummary.runningOwned &&
                          agentSummary.runningOwned > 0
                        ? `You have ${agentSummary.runningOwned} agent${
                            agentSummary.runningOwned === 1 ? "" : "s"
                          } running right now.`
                        : "Your agents are currently inactive."}
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

type HeroStatProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function HeroStat({ icon: Icon, label, value }: HeroStatProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
      <div className="rounded-full border border-primary/30 bg-primary/10 p-3 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground/90">{value}</span>
    </div>
  );
}
