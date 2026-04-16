import { HttpResponse, http } from "msw";
import { setupWorker } from "msw/browser";
import { z } from "zod";

import { API_URL } from "@/lib/api";
import type { LinkedSpotifyAccount } from "@/services/account";
import type { ModuleDevMockAdapter } from "@/dev/modules/types";

import type { SpotifyPlaybackState, SpotifyQueueItem } from "./spotify-service";

const DEV_BACKEND_URL = API_URL || "https://dev-modules.prometeo.local";

function backendUrl(pathname: string) {
    try {
        return new URL(pathname, DEV_BACKEND_URL).toString();
    } catch {
        return `${DEV_BACKEND_URL}${pathname}`;
    }
}

function success<T>(data: T) {
    return HttpResponse.json({ success: true, data });
}

function cloneValue<T>(value: T): T {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

const spotifyMockStateSchema = z.object({
    account: z.record(z.string(), z.unknown()).default({
        status: "connected",
        displayName: "Demo",
        avatarUrl: null,
        connectedAt: "2026-04-14T08:00:00.000Z",
        scopes: ["user-read-playback-state", "user-modify-playback-state"],
        lastError: null,
        product: "premium",
        externalUrl: "https://open.spotify.com/user/demo",
    }),
    playbackState: z
        .record(z.string(), z.unknown())
        .nullable()
        .default({
            is_playing: true,
            progress_ms: 92000,
            shuffle_state: false,
            repeat_state: "context",
            device: {
                id: "device-1",
                name: "Studio Speakers",
                volume_percent: 42,
                type: "Speaker",
            },
            context: {
                type: "playlist",
                href: "https://open.spotify.com/playlist/demo",
                uri: "spotify:playlist:demo",
            },
            item: {
                id: "track-1",
                name: "Infrarojo / Ultravioleta",
                artists: [{ name: "Hoke" }],
                album: {
                    name: "TRES CREUS",
                    images: [
                        {
                            "height": 640,
                            "url": "https://i.scdn.co/image/ab67616d0000b27301c42f9ef122c20778d74836",
                            "width": 640
                        },
                    ],
                },
                duration_ms: 262000,
            },
        }),
    queue: z
        .array(z.record(z.string(), z.unknown()))
        .default([
            {
                id: "track-2",
                name: "Midnight City",
                artists: [{ name: "M83" }],
                album: {
                    name: "Hurry Up, We're Dreaming",
                    images: [
                        {
                            url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80",
                            width: 640,
                            height: 640,
                        },
                    ],
                },
                duration_ms: 244000,
                uri: "spotify:track:track-2",
            },
            {
                id: "track-3",
                name: "Resonance",
                artists: [{ name: "HOME" }],
                album: {
                    name: "Odyssey",
                    images: [
                        {
                            url: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=800&q=80",
                            width: 640,
                            height: 640,
                        },
                    ],
                },
                duration_ms: 212000,
                uri: "spotify:track:track-3",
            },
        ]),
});

type SpotifyMockState = z.infer<typeof spotifyMockStateSchema>;

let worker: ReturnType<typeof setupWorker> | null = null;

async function ensureWorker() {
    if (worker) {
        return worker;
    }

    worker = setupWorker();
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
    return worker;
}

function buildHandlers(state: {
    account: LinkedSpotifyAccount;
    playbackState: SpotifyPlaybackState | null;
    queue: SpotifyQueueItem[];
}) {
    function getPlayback() {
        return state.playbackState;
    }
    function setPlayback(next: SpotifyPlaybackState | null) {
        state.playbackState = next;
    }

    return [
        http.get(backendUrl("/api/v1/integrations/spotify/status"), () =>
            success({ spotify: state.account }),
        ),
        http.get(backendUrl("/api/v1/integrations/spotify/player"), () =>
            success({ playbackState: getPlayback() }),
        ),
        http.get(backendUrl("/api/v1/integrations/spotify/player/queue"), () =>
            success({ queue: state.queue }),
        ),
        http.put(backendUrl("/api/v1/integrations/spotify/player/pause"), () => {
            const pb = getPlayback();
            if (pb) setPlayback({ ...pb, is_playing: false });
            return success({});
        }),
        http.put(backendUrl("/api/v1/integrations/spotify/player/play"), () => {
            const pb = getPlayback();
            if (pb) setPlayback({ ...pb, is_playing: true });
            return success({});
        }),
        http.post(backendUrl("/api/v1/integrations/spotify/player/next"), () => {
            const next = state.queue[0];
            const current = getPlayback()?.item;
            if (next && getPlayback()) {
                state.queue = [
                    ...state.queue.slice(1),
                    ...(current
                        ? [
                            {
                                id: current.id,
                                name: current.name,
                                artists: current.artists,
                                album: current.album,
                                duration_ms: current.duration_ms,
                                uri: `spotify:track:${current.id}`,
                            },
                        ]
                        : []),
                ];
                setPlayback({
                    ...getPlayback()!,
                    is_playing: true,
                    progress_ms: 0,
                    item: {
                        id: next.id,
                        name: next.name,
                        artists: (next as Record<string, unknown>).artists as NonNullable<SpotifyPlaybackState["item"]>["artists"],
                        album: (next as Record<string, unknown>).album as NonNullable<SpotifyPlaybackState["item"]>["album"],
                        duration_ms: next.duration_ms as number,
                    },
                });
            }
            return success({});
        }),
        http.post(
            backendUrl("/api/v1/integrations/spotify/player/previous"),
            () => success({}),
        ),
        http.put(
            backendUrl("/api/v1/integrations/spotify/player/seek"),
            async ({ request }) => {
                const payload = (await request.json()) as { positionMs?: number };
                const pb = getPlayback();
                if (pb) setPlayback({ ...pb, progress_ms: Number(payload.positionMs ?? 0) });
                return success({});
            },
        ),
        http.put(
            backendUrl("/api/v1/integrations/spotify/player/volume"),
            async ({ request }) => {
                const payload = (await request.json()) as { volumePercent?: number };
                const pb = getPlayback();
                if (pb?.device) {
                    setPlayback({
                        ...pb,
                        device: {
                            ...pb.device,
                            volume_percent: Number(payload.volumePercent ?? 0),
                        },
                    });
                }
                return success({});
            },
        ),
        http.put(
            backendUrl("/api/v1/integrations/spotify/player/shuffle"),
            async ({ request }) => {
                const payload = (await request.json()) as { state?: boolean };
                const pb = getPlayback();
                if (pb) setPlayback({ ...pb, shuffle_state: Boolean(payload.state) });
                return success({});
            },
        ),
        http.put(
            backendUrl("/api/v1/integrations/spotify/player/repeat"),
            async ({ request }) => {
                const payload = (await request.json()) as {
                    state?: "off" | "track" | "context";
                };
                const pb = getPlayback();
                if (pb) setPlayback({ ...pb, repeat_state: payload.state ?? "off" });
                return success({});
            },
        ),
        http.put(
            backendUrl("/api/v1/integrations/spotify/player/play-track"),
            async ({ request }) => {
                const payload = (await request.json()) as { uri?: string };
                const trackId = String(payload.uri ?? "").split(":").pop();
                const target = state.queue.find((i) => i.id === trackId);
                const pb = getPlayback();
                if (target && pb) {
                    setPlayback({
                        ...pb,
                        is_playing: true,
                        progress_ms: 0,
                        item: {
                            id: target.id,
                            name: target.name,
                            artists: (target as Record<string, unknown>).artists as NonNullable<SpotifyPlaybackState["item"]>["artists"],
                            album: (target as Record<string, unknown>).album as NonNullable<SpotifyPlaybackState["item"]>["album"],
                            duration_ms: target.duration_ms as number,
                        },
                    });
                }
                return success({});
            },
        ),
    ];
}

const adapter: ModuleDevMockAdapter<SpotifyMockState> = {
    stateSchema: spotifyMockStateSchema,

    createInitialState: () => spotifyMockStateSchema.parse({}),

    async apply(state) {
        const live = cloneValue(state);
        const w = await ensureWorker();
        w.use(
            ...buildHandlers({
                account: live.account as LinkedSpotifyAccount,
                playbackState: live.playbackState as SpotifyPlaybackState | null,
                queue: live.queue as SpotifyQueueItem[],
            }),
        );
    },

    async cleanup() {
        if (worker) {
            worker.resetHandlers();
        }
    },
};

export default adapter;
