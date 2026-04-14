import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSharedContext } from "@/hooks/useSharedContext";
import WledApi from "./wled-api";
import type {
    WledEffect,
    WledFullResponse,
    WledInfo,
    WledPalette,
    WledSegment,
    WledState,
} from "./types";

/* ── helpers ──────────────────────────────────────────────────────── */

const COLOR_SYNC_DELAY_MS = 1400;

export type ColorPreset = { label: string; r: number; g: number; b: number };

export const COLOR_PRESETS: ColorPreset[] = [
    { label: "Rojo", r: 255, g: 0, b: 0 },
    { label: "Naranja", r: 255, g: 120, b: 0 },
    { label: "Amarillo", r: 255, g: 200, b: 0 },
    { label: "Verde", r: 0, g: 255, b: 0 },
    { label: "Cian", r: 0, g: 255, b: 200 },
    { label: "Azul", r: 0, g: 0, b: 255 },
    { label: "Violeta", r: 140, g: 0, b: 255 },
    { label: "Rosa", r: 255, g: 0, b: 180 },
];

export function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
    ];
}

export function segmentPrimaryColor(seg: WledSegment): string {
    const col = seg.col?.[0];
    if (!col || col.length < 3) return "#888888";
    return rgbToHex(col[0], col[1], col[2]);
}

function filterEffects(raw: string[]): WledEffect[] {
    return raw
        .map((name, id) => ({ id, name }))
        .filter((e) => e.name !== "RSVD" && e.name !== "-");
}

function filterPalettes(raw: string[]): WledPalette[] {
    return raw.map((name, id) => ({ id, name }));
}

function shouldUpdateState(
    prev: WledState | null,
    next: WledState | null,
): boolean {
    if (prev === null || next === null) return true;
    if (prev.on !== next.on || prev.bri !== next.bri || prev.ps !== next.ps)
        return true;
    if (prev.seg.length !== next.seg.length) return true;
    for (let i = 0; i < prev.seg.length; i += 1) {
        const p = prev.seg[i];
        const n = next.seg[i];
        if (
            p.on !== n.on ||
            p.bri !== n.bri ||
            p.fx !== n.fx ||
            p.sx !== n.sx ||
            p.ix !== n.ix ||
            p.pal !== n.pal ||
            JSON.stringify(p.col) !== JSON.stringify(n.col)
        )
            return true;
    }
    return false;
}

/* ── hook ─────────────────────────────────────────────────────────── */

export function useWledController(
    config: Record<string, unknown>,
    widgetId: string,
) {
    const deviceIp = String(config["deviceIp"] ?? "");
    const refreshInterval = Number(config["refreshInterval"] ?? 5);
    const useSsl = Boolean(config["useSsl"] ?? false);

    const [wledState, setWledState] = useState<WledState | null>(null);
    const [info, setInfo] = useState<WledInfo | null>(null);
    const [effects, setEffects] = useState<WledEffect[]>([]);
    const [palettes, setPalettes] = useState<WledPalette[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [brightnessDraft, setBrightnessDraft] = useState<number | null>(null);
    const [fxSpeed, setFxSpeed] = useState(128);
    const [fxIntensity, setFxIntensity] = useState(128);
    const [savingColor, setSavingColor] = useState(false);

    const isFetchingRef = useRef(false);
    const isTogglingRef = useRef(false);
    const brightnessDebounceRef = useRef<number | null>(null);
    const colorSyncCooldownUntilRef = useRef(0);
    const colorRefreshTimeoutRef = useRef<number | null>(null);
    const stateRef = useRef<WledState | null>(null);

    const { registerAction, unregisterAction } = useSharedContext();

    const api = useMemo(
        () => (deviceIp ? new WledApi(deviceIp, useSsl) : null),
        [deviceIp, useSsl],
    );

    /* ── internal ──────────────────────────────────────────────────── */

    const applyState = useCallback((next: WledState) => {
        stateRef.current = next;
        setWledState((prev) => (shouldUpdateState(prev, next) ? next : prev));
    }, []);

    /* ── fetch ─────────────────────────────────────────────────────── */

    const fetchState = useCallback(
        async (options?: { force?: boolean }) => {
            if (!api) {
                setError("IP del dispositivo no configurada");
                setLoading(false);
                return;
            }
            if (!options?.force && Date.now() < colorSyncCooldownUntilRef.current)
                return;
            if (isTogglingRef.current || isFetchingRef.current) return;
            isFetchingRef.current = true;
            try {
                setError(null);
                const data: WledFullResponse = await api.getFullState();
                stateRef.current = data.state;
                setWledState((prev) =>
                    shouldUpdateState(prev, data.state) ? data.state : prev,
                );
                setInfo(data.info);
                if (effects.length === 0) setEffects(filterEffects(data.effects));
                if (palettes.length === 0) setPalettes(filterPalettes(data.palettes));
                setLoading(false);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Error al conectar con WLED",
                );
                setLoading(false);
            } finally {
                isFetchingRef.current = false;
            }
        },
        [api, effects.length, palettes.length],
    );

    const scheduleRefresh = useCallback(() => {
        colorSyncCooldownUntilRef.current = Date.now() + COLOR_SYNC_DELAY_MS;
        if (colorRefreshTimeoutRef.current !== null)
            window.clearTimeout(colorRefreshTimeoutRef.current);
        colorRefreshTimeoutRef.current = window.setTimeout(() => {
            colorRefreshTimeoutRef.current = null;
            void fetchState({ force: true });
        }, COLOR_SYNC_DELAY_MS);
    }, [fetchState]);

    /* ── toggle ────────────────────────────────────────────────────── */

    const togglePower = useCallback(async () => {
        if (!api || isTogglingRef.current) return;
        isTogglingRef.current = true;
        try {
            const next = await api.toggle();
            applyState(next);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error al cambiar el estado");
        } finally {
            window.setTimeout(() => {
                isTogglingRef.current = false;
            }, 300);
        }
    }, [api, applyState]);

    /* ── brightness ────────────────────────────────────────────────── */

    const scheduleBrightnessUpdate = useCallback(
        (value: number) => {
            if (!api) return;
            if (brightnessDebounceRef.current !== null)
                window.clearTimeout(brightnessDebounceRef.current);
            brightnessDebounceRef.current = window.setTimeout(async () => {
                try {
                    const next = await api.setBrightness(value);
                    applyState(next);
                } catch (e) {
                    setError(
                        e instanceof Error ? e.message : "Error al cambiar el brillo",
                    );
                }
            }, 180);
        },
        [api, applyState],
    );

    /* ── effects / palette ─────────────────────────────────────────── */

    const setEffect = useCallback(
        async (segId: number, fx: number) => {
            if (!api) return;
            try {
                const next = await api.setSegmentEffect(segId, fx, fxSpeed, fxIntensity);
                applyState(next);
                scheduleRefresh();
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Error al cambiar el efecto",
                );
            }
        },
        [api, applyState, fxSpeed, fxIntensity, scheduleRefresh],
    );

    const setPalette = useCallback(
        async (segId: number, pal: number) => {
            if (!api) return;
            try {
                const next = await api.setSegmentPalette(segId, pal);
                applyState(next);
                scheduleRefresh();
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Error al cambiar la paleta",
                );
            }
        },
        [api, applyState, scheduleRefresh],
    );

    const updateFxSpeed = useCallback(
        async (segId: number, value: number) => {
            if (!api) return;
            setFxSpeed(value);
            try {
                const next = await api.setState({ seg: [{ id: segId, sx: value }] });
                applyState(next);
            } catch {
                /* swallow */
            }
        },
        [api, applyState],
    );

    const updateFxIntensity = useCallback(
        async (segId: number, value: number) => {
            if (!api) return;
            setFxIntensity(value);
            try {
                const next = await api.setState({ seg: [{ id: segId, ix: value }] });
                applyState(next);
            } catch {
                /* swallow */
            }
        },
        [api, applyState],
    );

    /* ── segment ───────────────────────────────────────────────────── */

    const toggleSegment = useCallback(
        async (segId: number) => {
            if (!api) return;
            try {
                const next = await api.toggleSegment(segId);
                applyState(next);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Error al alternar segmento",
                );
            }
        },
        [api, applyState],
    );

    /* ── preset ────────────────────────────────────────────────────── */

    const applyPreset = useCallback(
        async (ps: number) => {
            if (!api) return;
            try {
                const next = await api.setPreset(ps);
                applyState(next);
                scheduleRefresh();
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : "Error al aplicar preset",
                );
            }
        },
        [api, applyState, scheduleRefresh],
    );

    /* ── color ─────────────────────────────────────────────────────── */

    const saveSegmentColor = useCallback(
        async (segId: number, hex: string) => {
            if (!api) return;
            setSavingColor(true);
            try {
                const [r, g, b] = hexToRgb(hex);
                const next = await api.setSegmentColor(segId, [[r, g, b]]);
                applyState(next);
                scheduleRefresh();
            } finally {
                setSavingColor(false);
            }
        },
        [api, applyState, scheduleRefresh],
    );

    /* ── side effects ──────────────────────────────────────────────── */

    useEffect(() => {
        void fetchState();
        const id = window.setInterval(
            () => void fetchState(),
            refreshInterval * 1000,
        );
        return () => window.clearInterval(id);
    }, [fetchState, refreshInterval]);

    useEffect(() => {
        return () => {
            if (brightnessDebounceRef.current !== null)
                window.clearTimeout(brightnessDebounceRef.current);
            if (colorRefreshTimeoutRef.current !== null)
                window.clearTimeout(colorRefreshTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!wledState) return;
        const seg = wledState.seg[wledState.mainseg] ?? wledState.seg[0];
        if (seg) {
            setFxSpeed(seg.sx);
            setFxIntensity(seg.ix);
        }
    }, [wledState]);

    const remoteBrightness = wledState?.bri ?? 0;
    useEffect(() => {
        if (brightnessDraft === null) return;
        if (Math.abs(remoteBrightness - brightnessDraft) <= 2)
            setBrightnessDraft(null);
    }, [brightnessDraft, remoteBrightness]);

    /* ── actions ───────────────────────────────────────────────────── */

    useEffect(() => {
        const toggleId = `${widgetId}:toggle`;
        const nextFxId = `${widgetId}:next-effect`;

        registerAction({
            id: toggleId,
            widgetId,
            title: "Alternar WLED",
            description: "Enciende o apaga el dispositivo WLED",
            intentTags: ["enciende wled", "apaga wled", "luces wled", "toggle wled"],
            run: async () => {
                if (!deviceIp || !api)
                    return {
                        success: false,
                        message: "Configura la IP del dispositivo WLED",
                    };
                await togglePower();
                return {
                    success: true,
                    message: `WLED ${stateRef.current?.on ? "encendido" : "apagado"}`,
                };
            },
        });

        registerAction({
            id: nextFxId,
            widgetId,
            title: "Siguiente efecto",
            description: "Cambia al siguiente efecto de WLED",
            intentTags: [
                "siguiente efecto",
                "cambiar efecto",
                "efecto wled",
                "next effect",
            ],
            run: async () => {
                if (!api || !stateRef.current)
                    return { success: false, message: "WLED no disponible" };
                const seg =
                    stateRef.current.seg[stateRef.current.mainseg] ??
                    stateRef.current.seg[0];
                if (!seg) return { success: false, message: "Sin segmentos" };
                const maxFx =
                    effects.length > 0 ? effects[effects.length - 1].id : 0;
                const nextFx = seg.fx >= maxFx ? 0 : seg.fx + 1;
                await setEffect(seg.id, nextFx);
                const name =
                    effects.find((e) => e.id === nextFx)?.name ?? `#${nextFx}`;
                return { success: true, message: `Efecto: ${name}` };
            },
        });

        return () => {
            unregisterAction(toggleId);
            unregisterAction(nextFxId);
        };
    }, [
        api,
        deviceIp,
        effects,
        registerAction,
        setEffect,
        togglePower,
        unregisterAction,
        widgetId,
    ]);

    /* ── computed ──────────────────────────────────────────────────── */

    const isOn = wledState?.on ?? false;
    const accent = isOn ? ("amber" as const) : ("slate" as const);
    const brightness = brightnessDraft ?? (wledState?.bri ?? 0);
    const brightnessPercent = Math.round((brightness / 255) * 100);
    const deviceName = info?.name ?? "WLED";
    const mainSeg = wledState
        ? (wledState.seg[wledState.mainseg] ?? wledState.seg[0])
        : undefined;
    const mainSegColor = mainSeg ? segmentPrimaryColor(mainSeg) : "#888";
    const currentFx = mainSeg
        ? effects.find((e) => e.id === mainSeg.fx)
        : undefined;
    const currentPal = mainSeg
        ? palettes.find((p) => p.id === mainSeg.pal)
        : undefined;

    return {
        deviceIp,
        api,
        wledState,
        info,
        effects,
        palettes,
        loading,
        error,
        brightnessDraft,
        setBrightnessDraft,
        fxSpeed,
        fxIntensity,
        savingColor,
        isOn,
        accent,
        brightness,
        brightnessPercent,
        deviceName,
        mainSeg,
        mainSegColor,
        currentFx,
        currentPal,
        fetchState,
        togglePower,
        scheduleBrightnessUpdate,
        setEffect,
        setPalette,
        updateFxSpeed,
        updateFxIntensity,
        toggleSegment,
        applyPreset,
        saveSegmentColor,
        stateRef,
    };
}

export type WledController = ReturnType<typeof useWledController>;
