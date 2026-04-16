import { HttpResponse, http } from "msw";
import { setupWorker } from "msw/browser";
import { z } from "zod";

import { API_URL } from "@/lib/api";
import type { ModuleDevMockAdapter } from "@/dev/modules/types";

import type {
    DiscordBotStatus,
    DiscordChannel,
    DiscordEpicNotifications,
    DiscordGuildInfo,
    DiscordMember,
    DiscordVoiceMember,
} from "@/services/discord";

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

// ---------------------------------------------------------------------------
// State schema
// ---------------------------------------------------------------------------

const voiceMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string(),
    muted: z.boolean(),
    deafened: z.boolean(),
    streaming: z.boolean(),
    video: z.boolean(),
});

const channelSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["text", "voice"]),
    members: z.number().optional(),
    voiceMembers: z.array(voiceMemberSchema).optional(),
});

const memberSchema = z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string(),
    status: z.enum(["online", "idle", "dnd", "offline"]),
});

const epicNotificationsSchema = z.object({
    enabled: z.boolean(),
    channelId: z.string().nullable(),
    guildId: z.string().nullable(),
    lastNotifiedAt: z.string().nullable(),
    lastError: z.string().nullable(),
});

const discordMockStateSchema = z.object({
    botConnected: z.boolean().default(true),
    botUser: z
        .object({
            id: z.string(),
            tag: z.string(),
            avatar: z.string(),
        })
        .nullable()
        .default({
            id: "bot-1",
            tag: "PrometeoBot#0001",
            avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
        }),
    guilds: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                icon: z.string().nullable(),
                memberCount: z.number(),
            }),
        )
        .default([
            {
                id: "guild-1",
                name: "PROMETEO Community",
                icon: null,
                memberCount: 128,
            },
        ]),
    channels: z.array(channelSchema).default([
        { id: "ch-general", name: "general", type: "text" },
        { id: "ch-dev", name: "dev-chat", type: "text" },
        { id: "ch-announcements", name: "announcements", type: "text" },
        {
            id: "ch-voice-1",
            name: "Lounge",
            type: "voice",
            members: 3,
            voiceMembers: [
                {
                    id: "user-1",
                    name: "Alice",
                    avatar: "https://cdn.discordapp.com/embed/avatars/1.png",
                    muted: false,
                    deafened: false,
                    streaming: false,
                    video: false,
                },
                {
                    id: "user-2",
                    name: "Bob",
                    avatar: "https://cdn.discordapp.com/embed/avatars/2.png",
                    muted: true,
                    deafened: false,
                    streaming: true,
                    video: false,
                },
                {
                    id: "user-3",
                    name: "Charlie",
                    avatar: "https://cdn.discordapp.com/embed/avatars/3.png",
                    muted: false,
                    deafened: false,
                    streaming: false,
                    video: true,
                },
            ],
        },
        {
            id: "ch-voice-2",
            name: "Gaming",
            type: "voice",
            members: 1,
            voiceMembers: [
                {
                    id: "user-4",
                    name: "Diana",
                    avatar: "https://cdn.discordapp.com/embed/avatars/4.png",
                    muted: false,
                    deafened: true,
                    streaming: false,
                    video: false,
                },
            ],
        },
    ]),
    members: z.array(memberSchema).default([
        {
            id: "user-1",
            name: "Alice",
            avatar: "https://cdn.discordapp.com/embed/avatars/1.png",
            status: "online",
        },
        {
            id: "user-2",
            name: "Bob",
            avatar: "https://cdn.discordapp.com/embed/avatars/2.png",
            status: "online",
        },
        {
            id: "user-3",
            name: "Charlie",
            avatar: "https://cdn.discordapp.com/embed/avatars/3.png",
            status: "idle",
        },
        {
            id: "user-4",
            name: "Diana",
            avatar: "https://cdn.discordapp.com/embed/avatars/4.png",
            status: "dnd",
        },
        {
            id: "user-5",
            name: "Eve",
            avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
            status: "offline",
        },
    ]),
    epicNotifications: epicNotificationsSchema.default({
        enabled: false,
        channelId: null,
        guildId: null,
        lastNotifiedAt: null,
        lastError: null,
    }),
    inviteUrl: z
        .string()
        .default(
            "https://discord.com/oauth2/authorize?client_id=000000000000000000&scope=bot&permissions=8",
        ),
});

type DiscordMockState = z.infer<typeof discordMockStateSchema>;

// ---------------------------------------------------------------------------
// MSW worker
// ---------------------------------------------------------------------------

let worker: ReturnType<typeof setupWorker> | null = null;

async function ensureWorker() {
    if (worker) return worker;
    worker = setupWorker();
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
    return worker;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function buildHandlers(state: {
    botConnected: boolean;
    botUser: DiscordBotStatus["user"];
    guilds: DiscordBotStatus["guilds"];
    channels: DiscordChannel[];
    members: DiscordMember[];
    epicNotifications: DiscordEpicNotifications;
    inviteUrl: string;
}) {
    return [
        // GET /api/v1/discord/status
        http.get(backendUrl("/api/v1/discord/status"), () =>
            success<DiscordBotStatus>({
                connected: state.botConnected,
                user: state.botUser,
                guilds: state.guilds,
            }),
        ),

        // GET /api/v1/discord/guilds/:guildId
        http.get(backendUrl("/api/v1/discord/guilds/:guildId"), ({ params }) => {
            const guild = state.guilds.find((g) => g.id === params.guildId);
            if (!guild) {
                return HttpResponse.json(
                    { success: false, message: "Guild not found" },
                    { status: 404 },
                );
            }
            return success<DiscordGuildInfo>({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                memberCount: guild.memberCount,
                channels: state.channels,
                members: state.members,
            });
        }),

        // GET /api/v1/discord/invite
        http.get(backendUrl("/api/v1/discord/invite"), () =>
            success({ url: state.inviteUrl }),
        ),

        // POST /api/v1/discord/guilds/:guildId/voice/:userId/disconnect
        http.post(
            backendUrl(
                "/api/v1/discord/guilds/:guildId/voice/:userId/disconnect",
            ),
            ({ params }) => {
                const userId = params.userId as string;
                for (const ch of state.channels) {
                    if (ch.voiceMembers) {
                        const idx = ch.voiceMembers.findIndex((m) => m.id === userId);
                        if (idx !== -1) {
                            const [removed] = ch.voiceMembers.splice(idx, 1);
                            ch.members = ch.voiceMembers.length;
                            return success({ id: removed.id, name: removed.name });
                        }
                    }
                }
                return success({ id: userId, name: "unknown" });
            },
        ),

        // POST /api/v1/discord/guilds/:guildId/voice/:userId/mute
        http.post(
            backendUrl("/api/v1/discord/guilds/:guildId/voice/:userId/mute"),
            async ({ params, request }) => {
                const userId = params.userId as string;
                const payload = (await request.json()) as { mute?: boolean };
                const mute = Boolean(payload.mute);

                let target: DiscordVoiceMember | undefined;
                for (const ch of state.channels) {
                    target = ch.voiceMembers?.find((m) => m.id === userId);
                    if (target) break;
                }

                if (target) {
                    target.muted = mute;
                    return success({ id: target.id, name: target.name, muted: mute });
                }
                return success({ id: userId, name: "unknown", muted: mute });
            },
        ),

        // GET /api/v1/discord/notifications/epic
        http.get(backendUrl("/api/v1/discord/notifications/epic"), () =>
            success(state.epicNotifications),
        ),

        // POST /api/v1/discord/notifications/epic
        http.post(
            backendUrl("/api/v1/discord/notifications/epic"),
            async ({ request }) => {
                const payload = (await request.json()) as {
                    enabled?: boolean;
                    channelId?: string | null;
                    guildId?: string | null;
                };
                state.epicNotifications = {
                    ...state.epicNotifications,
                    enabled: payload.enabled ?? state.epicNotifications.enabled,
                    channelId:
                        payload.channelId !== undefined
                            ? payload.channelId
                            : state.epicNotifications.channelId,
                    guildId:
                        payload.guildId !== undefined
                            ? payload.guildId
                            : state.epicNotifications.guildId,
                };
                return success({ state: state.epicNotifications, warning: null });
            },
        ),
    ];
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

const adapter: ModuleDevMockAdapter<DiscordMockState> = {
    stateSchema: discordMockStateSchema,

    createInitialState: () => discordMockStateSchema.parse({}),

    async apply(state) {
        const live = cloneValue(state);
        const w = await ensureWorker();
        w.use(
            ...buildHandlers({
                botConnected: live.botConnected,
                botUser: live.botUser as DiscordBotStatus["user"],
                guilds: live.guilds as DiscordBotStatus["guilds"],
                channels: live.channels as DiscordChannel[],
                members: live.members as DiscordMember[],
                epicNotifications: live.epicNotifications as DiscordEpicNotifications,
                inviteUrl: live.inviteUrl,
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
