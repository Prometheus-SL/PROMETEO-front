import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
    AlertTriangle,
    Bot,
    ChevronDown,
    Crown,
    ExternalLink,
    Gamepad2,
    Loader2,
    MessagesSquare,
    Music2,
    Save,
    Search,
    Shield,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    discordService,
    type DiscordChannel,
    type DiscordEpicNotificationConfig,
    type DiscordGameUpdateSubscription,
    type DiscordGameUpdatesConfig,
    type DiscordManagedGuild,
    type DiscordSteamGame,
} from "@/services/discord";
import { toast } from "sonner";

type DraftEntry = {
    enabled: boolean;
    channelId: string;
};

type GuildDraftMap = Record<string, DraftEntry>;

function entriesEqual(a: DraftEntry, b: DraftEntry) {
    return a.enabled === b.enabled && a.channelId === b.channelId;
}

function draftsEqual(a: GuildDraftMap, b: GuildDraftMap) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
        const av = a[k] ?? { enabled: false, channelId: "" };
        const bv = b[k] ?? { enabled: false, channelId: "" };
        if (!entriesEqual(av, bv)) return false;
    }
    return true;
}

function buildDraftFromServer(
    configs: DiscordEpicNotificationConfig[],
): GuildDraftMap {
    const out: GuildDraftMap = {};
    for (const c of configs) {
        out[c.guildId] = { enabled: Boolean(c.enabled), channelId: c.channelId ?? "" };
    }
    return out;
}

type GameUpdatesDraftEntry = {
    enabled: boolean;
    channelId: string;
    appIds: number[];
    subscriptions: DiscordGameUpdateSubscription[];
};

type GameUpdatesDraftMap = Record<string, GameUpdatesDraftEntry>;

function emptyGameUpdatesEntry(): GameUpdatesDraftEntry {
    return { enabled: false, channelId: "", appIds: [], subscriptions: [] };
}

function gameUpdatesEntryEqual(a: GameUpdatesDraftEntry, b: GameUpdatesDraftEntry) {
    if (a.enabled !== b.enabled) return false;
    if (a.channelId !== b.channelId) return false;
    if (a.appIds.length !== b.appIds.length) return false;
    const aSet = new Set(a.appIds);
    for (const id of b.appIds) {
        if (!aSet.has(id)) return false;
    }
    return true;
}

function gameUpdatesDraftsEqual(a: GameUpdatesDraftMap, b: GameUpdatesDraftMap) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
        const av = a[k] ?? emptyGameUpdatesEntry();
        const bv = b[k] ?? emptyGameUpdatesEntry();
        if (!gameUpdatesEntryEqual(av, bv)) return false;
    }
    return true;
}

function buildGameUpdatesDraftFromServer(
    configs: DiscordGameUpdatesConfig[],
): GameUpdatesDraftMap {
    const out: GameUpdatesDraftMap = {};
    for (const c of configs) {
        out[c.guildId] = {
            enabled: Boolean(c.enabled),
            channelId: c.channelId ?? "",
            appIds: c.subscriptions.map((s) => s.appId),
            subscriptions: c.subscriptions,
        };
    }
    return out;
}

function useGameSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<DiscordSteamGame[]>([]);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        timerRef.current = setTimeout(async () => {
            try {
                const hits = await discordService.searchGames(trimmed);
                setResults(hits);
            } catch (_err) {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [query]);

    return { query, setQuery, results, loading };
}

export default function BotDiscordPage() {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [guilds, setGuilds] = useState<DiscordManagedGuild[]>([]);
    const [needsLink, setNeedsLink] = useState(false);
    const [needsReauth, setNeedsReauth] = useState(false);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);

    const [savedDraft, setSavedDraft] = useState<GuildDraftMap>({});
    const [draft, setDraft] = useState<GuildDraftMap>({});
    const [gameUpdatesServer, setGameUpdatesServer] = useState<GameUpdatesDraftMap>({});
    const [gameUpdatesDraft, setGameUpdatesDraft] = useState<GameUpdatesDraftMap>({});
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);

    const [channelsByGuild, setChannelsByGuild] = useState<
        Record<string, { loading: boolean; channels: DiscordChannel[] | null; error: string | null }>
    >({});

    const isDirty = useMemo(
        () =>
            !draftsEqual(draft, savedDraft) ||
            !gameUpdatesDraftsEqual(gameUpdatesDraft, gameUpdatesServer),
        [draft, savedDraft, gameUpdatesDraft, gameUpdatesServer],
    );
    const isDirtyRef = useRef(isDirty);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [state, myGuilds, invite, gameUpdatesState] = await Promise.all([
                    discordService.getEpicNotifications(),
                    discordService.getMyGuilds(),
                    discordService.getInviteUrl().catch(() => null),
                    discordService.getGameUpdates(),
                ]);
                if (cancelled) return;
                const initial = buildDraftFromServer(state.configs);
                setSavedDraft(initial);
                setDraft(initial);
                const initialGU = buildGameUpdatesDraftFromServer(gameUpdatesState.configs);
                setGameUpdatesServer(initialGU);
                setGameUpdatesDraft(initialGU);
                setGuilds(myGuilds.guilds);
                setNeedsLink(myGuilds.needsLink);
                setNeedsReauth(myGuilds.needsReauth);
                setInviteUrl(invite);
                setLoadError(null);

                const presentIds = new Set(
                    myGuilds.guilds.filter((g) => g.botPresent).map((g) => g.id),
                );
                const enabledGuildIds = new Set<string>();
                for (const [guildId, entry] of Object.entries(initial)) {
                    if (entry.enabled) enabledGuildIds.add(guildId);
                }
                for (const [guildId, entry] of Object.entries(initialGU)) {
                    if (entry.enabled) enabledGuildIds.add(guildId);
                }
                for (const guildId of enabledGuildIds) {
                    if (presentIds.has(guildId)) void loadChannelsForGuild(guildId);
                }
            } catch (err) {
                if (cancelled) return;
                setLoadError(
                    err instanceof Error
                        ? err.message
                        : "No se pudo cargar la configuración",
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!isDirty) return;
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [isDirty]);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            setShowLeaveDialog(true);
        }
    }, [blocker.state]);

    const loadChannelsForGuild = useCallback(async (guildId: string) => {
        setChannelsByGuild((prev) => ({
            ...prev,
            [guildId]: { loading: true, channels: prev[guildId]?.channels ?? null, error: null },
        }));
        try {
            const info = await discordService.getGuildInfo(guildId);
            setChannelsByGuild((prev) => ({
                ...prev,
                [guildId]: {
                    loading: false,
                    channels: info.channels.filter((c) => c.type === "text"),
                    error: null,
                },
            }));
        } catch (err) {
            setChannelsByGuild((prev) => ({
                ...prev,
                [guildId]: {
                    loading: false,
                    channels: null,
                    error: err instanceof Error ? err.message : "No se pudieron cargar los canales",
                },
            }));
        }
    }, []);

    const handleToggleEnabled = useCallback(
        (guildId: string, next: boolean) => {
            setDraft((prev) => ({
                ...prev,
                [guildId]: {
                    enabled: next,
                    channelId: prev[guildId]?.channelId ?? "",
                },
            }));
            if (next && !channelsByGuild[guildId]?.channels) {
                void loadChannelsForGuild(guildId);
            }
        },
        [channelsByGuild, loadChannelsForGuild],
    );

    const handleChannelChange = useCallback((guildId: string, channelId: string) => {
        setDraft((prev) => ({
            ...prev,
            [guildId]: { enabled: prev[guildId]?.enabled ?? false, channelId },
        }));
    }, []);

    const handleSave = useCallback(async () => {
        const configs = Object.entries(draft)
            .filter(([guildId]) => Boolean(guildId))
            .map(([guildId, entry]) => ({
                guildId,
                channelId: entry.channelId ? entry.channelId : null,
                enabled: Boolean(entry.enabled),
            }));

        const missingChannel = configs.find((c) => c.enabled && !c.channelId);
        if (missingChannel) {
            toast.error("Selecciona un canal para cada servidor activo");
            return;
        }

        const guConfigs = Object.entries(gameUpdatesDraft).map(([guildId, entry]) => ({
            guildId,
            channelId: entry.channelId ? entry.channelId : null,
            enabled: Boolean(entry.enabled),
            subscriptions: entry.appIds.map((appId) => ({ appId })),
        }));
        const guMissingChannel = guConfigs.find((c) => c.enabled && !c.channelId);
        if (guMissingChannel) {
            toast.error("Selecciona un canal para las actualizaciones de juegos en cada servidor activo");
            return;
        }

        setSaving(true);
        try {
            const result = await discordService.setEpicNotifications({ configs });
            const next = buildDraftFromServer(result.configs);
            setSavedDraft(next);
            setDraft(next);
            let epicWarning = result.warning ?? null;

            const guResult = await discordService.setGameUpdates({ configs: guConfigs });
            const nextGU = buildGameUpdatesDraftFromServer(guResult.configs);
            setGameUpdatesServer(nextGU);
            setGameUpdatesDraft(nextGU);

            if (epicWarning) toast.warning(epicWarning);
            if (guResult.warning) toast.warning(guResult.warning);
            if (!epicWarning && !guResult.warning) toast.success("Configuración guardada");
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "No se pudo guardar la configuración",
            );
        } finally {
            setSaving(false);
        }
    }, [draft, gameUpdatesDraft]);

    const handleConfirmLeave = useCallback(() => {
        setShowLeaveDialog(false);
        blocker.proceed?.();
    }, [blocker]);

    const handleCancelLeave = useCallback(() => {
        setShowLeaveDialog(false);
        blocker.reset?.();
    }, [blocker]);

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
                <p className="text-sm text-muted-foreground">
                    Configura las notificaciones que el bot envía a tus servidores de Discord.
                </p>
            </header>

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Cargando…
                </div>
            ) : loadError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    {loadError}
                </div>
            ) : (
                <>
                    {needsLink ? (
                        <Card>
                            <CardContent className="p-6 text-sm">
                                Vincula tu cuenta de Discord en Ajustes para configurar notificaciones.
                            </CardContent>
                        </Card>
                    ) : needsReauth ? (
                        <Card>
                            <CardContent className="flex flex-col gap-3 p-6 text-sm">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="size-4" />
                                    Permisos insuficientes
                                </div>
                                <p className="text-muted-foreground">
                                    Para listar los servidores donde eres administrador o propietario,
                                    vuelve a vincular tu cuenta de Discord concediendo el permiso de
                                    acceso a tus servidores.
                                </p>
                            </CardContent>
                        </Card>
                    ) : guilds.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-sm text-muted-foreground">
                                No hemos encontrado servidores donde seas administrador o propietario.
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <NotificationSection
                                title="Juegos"
                                icon={Gamepad2}
                                description="Avisos sobre Epic, Steam y otras tiendas."
                                defaultOpen
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <MessagesSquare className="size-4" />
                                            Juegos gratis · Epic
                                        </CardTitle>
                                        <CardDescription>
                                            Aviso cuando Epic regala un juego. Activa cada servidor y elige un canal.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        {guilds.map((g) => (
                                            <EpicGuildRow
                                                key={g.id}
                                                guild={g}
                                                entry={draft[g.id] ?? { enabled: false, channelId: "" }}
                                                channelsState={channelsByGuild[g.id]}
                                                inviteUrl={inviteUrl}
                                                onToggle={(next) => handleToggleEnabled(g.id, next)}
                                                onChannelChange={(v) => handleChannelChange(g.id, v)}
                                            />
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Gamepad2 className="size-4" />
                                            Actualizaciones · Steam
                                        </CardTitle>
                                        <CardDescription>
                                            Aviso cuando salen parches o notas de actualización de los juegos que suscribas.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2">
                                        {guilds.map((g) => (
                                            <SteamGuildRow
                                                key={g.id}
                                                guild={g}
                                                channels={channelsByGuild[g.id]?.channels ?? []}
                                                entry={gameUpdatesDraft[g.id] ?? emptyGameUpdatesEntry()}
                                                inviteUrl={inviteUrl}
                                                disabled={!g.botPresent}
                                                onChange={(next) => {
                                                    setGameUpdatesDraft((prev) => ({ ...prev, [g.id]: next }));
                                                    if (
                                                        next.enabled &&
                                                        g.botPresent &&
                                                        !channelsByGuild[g.id]?.channels &&
                                                        !channelsByGuild[g.id]?.loading
                                                    ) {
                                                        void loadChannelsForGuild(g.id);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </CardContent>
                                </Card>
                            </NotificationSection>
                            <NotificationSection
                                title="Música"
                                icon={Music2}
                                description="Reproducción de música del bot en tus canales de voz."
                            >
                                <Card>
                                    <CardContent className="p-6 text-sm text-muted-foreground">
                                        Próximamente: el bot podrá reproducir música de Spotify en tus canales de voz.
                                    </CardContent>
                                </Card>
                            </NotificationSection>
                        </>
                    )}

                    <div className="sticky bottom-4 flex justify-end">
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={!isDirty || saving || needsLink || needsReauth}
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            Guardar cambios
                        </Button>
                    </div>
                </>
            )}

            <AlertDialog open={showLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tienes cambios sin guardar. Si sales ahora, se perderán.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelLeave}>
                            Seguir editando
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmLeave}>
                            Salir sin guardar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function GuildIdentity({ guild }: { guild: DiscordManagedGuild }) {
    return (
        <div className="flex items-center gap-3 min-w-0 flex-1">
            {guild.icon ? (
                <img
                    src={guild.icon}
                    alt=""
                    className="size-8 rounded-full object-cover"
                />
            ) : (
                <div className="size-8 rounded-full bg-muted" />
            )}
            <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    {guild.isOwner ? (
                        <Crown
                            className="size-3.5 shrink-0 text-amber-500"
                            aria-label="Propietario"
                        />
                    ) : guild.isAdmin ? (
                        <Shield
                            className="size-3.5 shrink-0 text-emerald-500"
                            aria-label="Administrador"
                        />
                    ) : null}
                    <span className="truncate font-medium">{guild.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {guild.botPresent ? (
                        <>
                            <Bot className="size-3" />
                            Bot presente
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="size-3 text-amber-500" />
                            Bot no instalado
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function InviteBotButton({ url }: { url: string }) {
    return (
        <Button type="button" size="sm" variant="outline" asChild className="shrink-0">
            <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Invitar bot
            </a>
        </Button>
    );
}

type EpicGuildRowProps = {
    guild: DiscordManagedGuild;
    entry: DraftEntry;
    channelsState:
        | { loading: boolean; channels: DiscordChannel[] | null; error: string | null }
        | undefined;
    inviteUrl: string | null;
    onToggle: (next: boolean) => void;
    onChannelChange: (channelId: string) => void;
};

function EpicGuildRow({
    guild,
    entry,
    channelsState,
    inviteUrl,
    onToggle,
    onChannelChange,
}: EpicGuildRowProps) {
    const canEnable = guild.botPresent;
    return (
        <div className="flex flex-col gap-2 rounded-md border bg-card/40 p-3">
            <div className="flex items-center justify-between gap-3">
                <GuildIdentity guild={guild} />
                <div className="flex items-center gap-2 shrink-0">
                    {!guild.botPresent && inviteUrl ? <InviteBotButton url={inviteUrl} /> : null}
                    <Switch
                        checked={entry.enabled}
                        disabled={!canEnable}
                        onCheckedChange={onToggle}
                        aria-label={`Activar notificaciones de Epic en ${guild.name}`}
                    />
                </div>
            </div>
            {entry.enabled ? (
                <div className="flex flex-col gap-1.5 pl-11 sm:flex-row sm:items-center sm:gap-3">
                    <Label
                        htmlFor={`epic-channel-${guild.id}`}
                        className="text-xs text-muted-foreground sm:shrink-0"
                    >
                        Canal
                    </Label>
                    <div className="flex-1">
                        <Select
                            value={entry.channelId}
                            onValueChange={onChannelChange}
                            disabled={channelsState?.loading || !canEnable}
                        >
                            <SelectTrigger id={`epic-channel-${guild.id}`} className="w-full sm:max-w-xs">
                                <SelectValue
                                    placeholder={
                                        channelsState?.loading
                                            ? "Cargando canales…"
                                            : "Selecciona un canal"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {(channelsState?.channels ?? []).map((ch) => (
                                    <SelectItem key={ch.id} value={ch.id}>
                                        #{ch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {channelsState?.error ? (
                            <p className="mt-1 text-xs text-destructive">{channelsState.error}</p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

type SteamGuildRowProps = {
    guild: DiscordManagedGuild;
    channels: DiscordChannel[];
    entry: GameUpdatesDraftEntry;
    inviteUrl: string | null;
    onChange: (next: GameUpdatesDraftEntry) => void;
    disabled: boolean;
};

function SteamGuildRow({ guild, channels, entry, inviteUrl, onChange, disabled }: SteamGuildRowProps) {
    const { query, setQuery, results, loading } = useGameSearch();
    const [open, setOpen] = useState(false);
    const maxReached = entry.appIds.length >= 25;
    const subscribedSet = new Set(entry.appIds);

    function addGame(game: DiscordSteamGame) {
        if (subscribedSet.has(game.appId) || maxReached) return;
        onChange({
            ...entry,
            appIds: [...entry.appIds, game.appId],
            subscriptions: [
                ...entry.subscriptions,
                { appId: game.appId, name: game.name, lastNotifiedAt: null, lastError: null },
            ],
        });
        setQuery("");
        setOpen(false);
    }

    function removeGame(appId: number) {
        onChange({
            ...entry,
            appIds: entry.appIds.filter((id) => id !== appId),
            subscriptions: entry.subscriptions.filter((s) => s.appId !== appId),
        });
    }

    const textChannels = channels.filter((c) => c.type === "text");

    return (
        <div className="flex flex-col gap-3 rounded-md border bg-card/40 p-3">
            <div className="flex items-center justify-between gap-3">
                <GuildIdentity guild={guild} />
                <div className="flex items-center gap-2 shrink-0">
                    {!guild.botPresent && inviteUrl ? <InviteBotButton url={inviteUrl} /> : null}
                    <Switch
                        id={`gu-enabled-${guild.id}`}
                        checked={entry.enabled}
                        onCheckedChange={(v) => onChange({ ...entry, enabled: Boolean(v) })}
                        disabled={disabled}
                        aria-label={`Activar actualizaciones de Steam en ${guild.name}`}
                    />
                </div>
            </div>

            {entry.enabled ? (
                <div className="flex flex-col gap-3 pl-11">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                        <Label
                            htmlFor={`gu-channel-${guild.id}`}
                            className="text-xs text-muted-foreground sm:shrink-0"
                        >
                            Canal
                        </Label>
                        <Select
                            value={entry.channelId || undefined}
                            onValueChange={(v) => onChange({ ...entry, channelId: v })}
                            disabled={disabled}
                        >
                            <SelectTrigger id={`gu-channel-${guild.id}`} className="w-full sm:max-w-xs">
                                <SelectValue placeholder="Selecciona un canal" />
                            </SelectTrigger>
                            <SelectContent>
                                {textChannels.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        #{c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">
                            Juegos suscritos ({entry.appIds.length}/25)
                        </Label>
                    <Popover open={open} onOpenChange={setOpen} modal={false}>
                        <PopoverAnchor asChild>
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={maxReached ? "Máximo 25 juegos alcanzado" : "Buscar juegos en Steam..."}
                                    value={query}
                                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                                    onFocus={() => { if (query.trim().length > 0) setOpen(true); }}
                                    disabled={disabled || maxReached}
                                    className="pl-8"
                                />
                            </div>
                        </PopoverAnchor>
                        <PopoverContent
                            className="w-[320px] p-1"
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onCloseAutoFocus={(e) => e.preventDefault()}
                            onInteractOutside={(e) => {
                                if ((e.target as HTMLElement)?.tagName === "INPUT") e.preventDefault();
                            }}
                        >
                            {loading && <div className="px-2 py-1.5 text-sm text-muted-foreground">Buscando…</div>}
                            {!loading && query.trim().length < 2 && (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Escribe al menos 2 caracteres</div>
                            )}
                            {!loading && query.trim().length >= 2 && results.length === 0 && (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">Sin resultados</div>
                            )}
                            {!loading && results.map((g) => {
                                const already = subscribedSet.has(g.appId);
                                return (
                                    <button
                                        key={g.appId}
                                        type="button"
                                        className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={already || maxReached}
                                        onClick={() => addGame(g)}
                                    >
                                        {g.name}{already && " (ya añadido)"}
                                    </button>
                                );
                            })}
                        </PopoverContent>
                    </Popover>
                        {entry.subscriptions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {entry.subscriptions.map((s) => (
                                    <Badge
                                        key={s.appId}
                                        variant="secondary"
                                        className="gap-1 max-w-full items-start whitespace-normal break-words text-left"
                                    >
                                        <span className="min-w-0 break-words">{s.name}</span>
                                        <button
                                            type="button"
                                            aria-label={`Eliminar ${s.name}`}
                                            onClick={() => removeGame(s.appId)}
                                            disabled={disabled}
                                            className="mt-0.5 shrink-0 rounded-full outline-none hover:bg-muted-foreground/20"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

type NotificationSectionProps = {
    title: string;
    icon: LucideIcon;
    description?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
};

function NotificationSection({
    title,
    icon: Icon,
    description,
    defaultOpen = false,
    children,
}: NotificationSectionProps) {
    return (
        <Collapsible defaultOpen={defaultOpen} className="rounded-lg border bg-card">
            <CollapsibleTrigger
                className="group flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                aria-label={`Mostrar u ocultar la sección ${title}`}
            >
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col min-w-0">
                    <span className="text-base font-semibold tracking-tight">{title}</span>
                    {description ? (
                        <span className="text-xs text-muted-foreground">{description}</span>
                    ) : null}
                </div>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <div className="flex flex-col gap-2 p-4 pt-0">{children}</div>
            </CollapsibleContent>
        </Collapsible>
    );
}
