import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";
import type { LinkedSpotifyAccount } from "@/services/account";

import type { SpotifyPlaybackState, SpotifyQueueItem } from "./spotify-service";

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
        name: "Aimbot",
        artists: [{ name: "Hoke" }],
        album: {
          name: "TRES CREUS",
          images: [
            {
              height: 640,
              url: "https://i.scdn.co/image/ab67616d0000b27301c42f9ef122c20778d74836",
              width: 640,
            },
          ],
        },
        duration_ms: 217000,
      },
    }),
  queue: z.array(z.record(z.string(), z.unknown())).default([
    {
      id: "track-2",
      name: "Infrarojo / Ultravioleta",
      artists: [{ name: "Hoke" }],
      album: {
        name: "TRES CREUS",
        images: [
          {
            url: "https://i.scdn.co/image/ab67616d0000b27301c42f9ef122c20778d74836",
            width: 640,
            height: 640,
          },
        ],
      },
      duration_ms: 262000,
      uri: "spotify:track:track-2",
    },
    {
      id: "track-3",
      name: "Cicatrices",
      artists: [{ name: "Natos y Waor" }],
      album: {
        name: "Cicatrices",
        images: [
          {
            url: "https://picsum.photos/seed/cicatrices-nyw/640",
            width: 640,
            height: 640,
          },
        ],
      },
      duration_ms: 253000,
      uri: "spotify:track:track-3",
    },
    {
      id: "track-4",
      name: "Martes 13",
      artists: [{ name: "Natos y Waor" }],
      album: {
        name: "Martes 13",
        images: [
          {
            url: "https://picsum.photos/seed/martes13-nyw/640",
            width: 640,
            height: 640,
          },
        ],
      },
      duration_ms: 228000,
      uri: "spotify:track:track-4",
    },
    {
      id: "track-5",
      name: "MONACO",
      artists: [{ name: "Bad Bunny" }],
      album: {
        name: "nadie sabe lo que va a pasar mañana",
        images: [
          {
            url: "https://picsum.photos/seed/nslqvapm-bb/640",
            width: 640,
            height: 640,
          },
        ],
      },
      duration_ms: 282000,
      uri: "spotify:track:track-5",
    },
    {
      id: "track-6",
      name: "Tití Me Preguntó",
      artists: [{ name: "Bad Bunny" }],
      album: {
        name: "Un Verano Sin Ti",
        images: [
          {
            url: "https://i.scdn.co/image/ab67616d0000b27349d694203245f241a1bcaa72",
            width: 640,
            height: 640,
          },
        ],
      },
      duration_ms: 243000,
      uri: "spotify:track:track-6",
    },
  ]),
});

type SpotifyMockState = z.infer<typeof spotifyMockStateSchema>;

function shuffleQueuePreview(queue: SpotifyQueueItem[]) {
  if (queue.length < 2) return queue;

  const oddItems = queue.filter((_, index) => index % 2 === 1);
  const evenItems = queue.filter((_, index) => index % 2 === 0);
  return [...oddItems, ...evenItems];
}

function buildHandlers(state: SpotifyMockState) {
  const live = {
    account: state.account as LinkedSpotifyAccount,
    playbackState: state.playbackState as SpotifyPlaybackState | null,
    queue: state.queue as SpotifyQueueItem[],
  };
  const defaultQueueOrder = new Map(
    live.queue.map((item, index) => [item.id, index]),
  );

  function getPlayback() {
    return live.playbackState;
  }

  function setPlayback(next: SpotifyPlaybackState | null) {
    live.playbackState = next;
  }

  return [
    http.get(createModuleDevBackendUrl("/api/v1/integrations/spotify/status"), () =>
      createModuleDevSuccessResponse({ spotify: live.account }),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/integrations/spotify/player"), () =>
      createModuleDevSuccessResponse({ playbackState: getPlayback() }),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/integrations/spotify/player/queue"), () =>
      createModuleDevSuccessResponse({ queue: live.queue }),
    ),
    http.put(createModuleDevBackendUrl("/api/v1/integrations/spotify/player/pause"), () => {
      const pb = getPlayback();
      if (pb) setPlayback({ ...pb, is_playing: false });
      return createModuleDevSuccessResponse({});
    }),
    http.put(createModuleDevBackendUrl("/api/v1/integrations/spotify/player/play"), () => {
      const pb = getPlayback();
      if (pb) setPlayback({ ...pb, is_playing: true });
      return createModuleDevSuccessResponse({});
    }),
    http.post(createModuleDevBackendUrl("/api/v1/integrations/spotify/player/next"), () => {
      const next = live.queue[0];
      const current = getPlayback()?.item;
      if (next && getPlayback()) {
        live.queue = [
          ...live.queue.slice(1),
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
            artists: (next as Record<string, unknown>)
              .artists as NonNullable<SpotifyPlaybackState["item"]>["artists"],
            album: (next as Record<string, unknown>)
              .album as NonNullable<SpotifyPlaybackState["item"]>["album"],
            duration_ms: next.duration_ms as number,
          },
        });
      }
      return createModuleDevSuccessResponse({});
    }),
    http.post(
      createModuleDevBackendUrl("/api/v1/integrations/spotify/player/previous"),
      () => createModuleDevSuccessResponse({}),
    ),
    http.put(
      createModuleDevBackendUrl("/api/v1/integrations/spotify/player/seek"),
      async ({ request }) => {
        const payload = (await request.json()) as { positionMs?: number };
        const pb = getPlayback();
        if (pb) {
          setPlayback({
            ...pb,
            progress_ms: Number(payload.positionMs ?? 0),
          });
        }
        return createModuleDevSuccessResponse({});
      },
    ),
    http.put(
      createModuleDevBackendUrl("/api/v1/integrations/spotify/player/volume"),
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
        return createModuleDevSuccessResponse({});
      },
    ),
    http.put(
      createModuleDevBackendUrl("/api/v1/integrations/spotify/player/shuffle"),
      async ({ request }) => {
        const payload = (await request.json()) as { state?: boolean };
        const pb = getPlayback();
        const enabled = Boolean(payload.state);

        if (enabled) {
          live.queue = shuffleQueuePreview(live.queue);
        } else {
          live.queue = [...live.queue].sort(
            (a, b) =>
              (defaultQueueOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
              (defaultQueueOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
          );
        }

        if (pb) setPlayback({ ...pb, shuffle_state: enabled });
        return createModuleDevSuccessResponse({});
      },
    ),
    http.put(
      createModuleDevBackendUrl("/api/v1/integrations/spotify/player/repeat"),
      async ({ request }) => {
        const payload = (await request.json()) as {
          state?: "off" | "track" | "context";
        };
        const pb = getPlayback();
        if (pb) setPlayback({ ...pb, repeat_state: payload.state ?? "off" });
        return createModuleDevSuccessResponse({});
      },
    ),
    http.put(
      createModuleDevBackendUrl("/api/v1/integrations/spotify/player/play-track"),
      async ({ request }) => {
        const payload = (await request.json()) as { uri?: string };
        const trackId = String(payload.uri ?? "").split(":").pop();
        const target = live.queue.find((item) => item.id === trackId);
        const pb = getPlayback();
        if (target && pb) {
          setPlayback({
            ...pb,
            is_playing: true,
            progress_ms: 0,
            item: {
              id: target.id,
              name: target.name,
              artists: (target as Record<string, unknown>)
                .artists as NonNullable<SpotifyPlaybackState["item"]>["artists"],
              album: (target as Record<string, unknown>)
                .album as NonNullable<SpotifyPlaybackState["item"]>["album"],
              duration_ms: target.duration_ms as number,
            },
          });
        }
        return createModuleDevSuccessResponse({});
      },
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<SpotifyMockState>({
  stateSchema: spotifyMockStateSchema,
  buildHandlers,
});

export default adapter;
