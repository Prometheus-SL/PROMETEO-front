import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
    AlertTriangle,
    Bot,
    Crown,
    ExternalLink,
    Loader2,
    MessagesSquare,
    Save,
    Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
    type DiscordManagedGuild,
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
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);

    const [channelsByGuild, setChannelsByGuild] = useState<
        Record<string, { loading: boolean; channels: DiscordChannel[] | null; error: string | null }>
    >({});

    const isDirty = useMemo(() => !draftsEqual(draft, savedDraft), [draft, savedDraft]);
    const isDirtyRef = useRef(isDirty);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [state, myGuilds, invite] = await Promise.all([
                    discordService.getEpicNotifications(),
                    discordService.getMyGuilds(),
                    discordService.getInviteUrl().catch(() => null),
                ]);
                if (cancelled) return;
                const initial = buildDraftFromServer(state.configs);
                setSavedDraft(initial);
                setDraft(initial);
                setGuilds(myGuilds.guilds);
                setNeedsLink(myGuilds.needsLink);
                setNeedsReauth(myGuilds.needsReauth);
                setInviteUrl(invite);
                setLoadError(null);

                const presentIds = new Set(
                    myGuilds.guilds.filter((g) => g.botPresent).map((g) => g.id),
                );
                for (const [guildId, entry] of Object.entries(initial)) {
                    if (entry.enabled && presentIds.has(guildId)) {
                        void loadChannelsForGuild(guildId);
                    }
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

        setSaving(true);
        try {
            const result = await discordService.setEpicNotifications({ configs });
            const next = buildDraftFromServer(result.configs);
            setSavedDraft(next);
            setDraft(next);
            if (result.warning) {
                toast.warning(result.warning);
            } else {
                toast.success("Configuración guardada");
            }
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "No se pudo guardar la configuración",
            );
        } finally {
            setSaving(false);
        }
    }, [draft]);

    const handleConfirmLeave = useCallback(() => {
        setShowLeaveDialog(false);
        blocker.proceed?.();
    }, [blocker]);

    const handleCancelLeave = useCallback(() => {
        setShowLeaveDialog(false);
        blocker.reset?.();
    }, [blocker]);

    const renderGuildRow = (g: DiscordManagedGuild) => {
        const entry = draft[g.id] ?? { enabled: false, channelId: "" };
        const channelsState = channelsByGuild[g.id];
        const canEnable = g.botPresent;

        return (
            <div
                key={g.id}
                className="flex flex-col gap-3 rounded-lg border bg-card/40 p-4"
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {g.icon ? (
                            <img
                                src={g.icon}
                                alt=""
                                className="size-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="size-8 rounded-full bg-muted" />
                        )}
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                {g.isOwner ? (
                                    <Crown
                                        className="size-3.5 shrink-0 text-amber-500"
                                        aria-label="Propietario"
                                    />
                                ) : g.isAdmin ? (
                                    <Shield
                                        className="size-3.5 shrink-0 text-emerald-500"
                                        aria-label="Administrador"
                                    />
                                ) : null}
                                <span className="truncate font-medium">{g.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {g.botPresent ? (
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
                    <div className="flex items-center gap-2 shrink-0">
                        {!g.botPresent && inviteUrl ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                asChild
                            >
                                <a
                                    href={inviteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink className="size-3.5" />
                                    Invitar bot
                                </a>
                            </Button>
                        ) : null}
                        <Switch
                            checked={entry.enabled}
                            disabled={!canEnable}
                            onCheckedChange={(next) => handleToggleEnabled(g.id, next)}
                            aria-label={`Activar notificaciones en ${g.name}`}
                        />
                    </div>
                </div>
                {entry.enabled ? (
                    <div className="flex flex-col gap-2">
                        <Label htmlFor={`channel-${g.id}`}>Canal</Label>
                        <Select
                            value={entry.channelId}
                            onValueChange={(v) => handleChannelChange(g.id, v)}
                            disabled={channelsState?.loading || !canEnable}
                        >
                            <SelectTrigger id={`channel-${g.id}`} className="w-full">
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
                            <p className="text-xs text-destructive">{channelsState.error}</p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">Bot discord</h1>
                <p className="text-sm text-muted-foreground">
                    Configura las funciones del bot en tus servidores de Discord.
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
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessagesSquare className="size-4" />
                                    Epic Games — Juegos gratuitos
                                </CardTitle>
                                <CardDescription>
                                    Activa el aviso en cada servidor donde quieras recibirlo. Puedes
                                    configurar múltiples servidores a la vez.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {guilds.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                        No hemos encontrado servidores donde seas administrador o propietario.
                                    </div>
                                ) : (
                                    guilds.map(renderGuildRow)
                                )}
                            </CardContent>
                        </Card>
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
