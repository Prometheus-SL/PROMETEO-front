import { api } from "@/lib/api";

export type DiscordGuild = {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
};

export type DiscordBotStatus = {
    connected: boolean;
    user: { id: string; tag: string; avatar: string } | null;
    guilds: DiscordGuild[];
};

export type DiscordVoiceMember = {
    id: string;
    name: string;
    avatar: string;
    muted: boolean;
    deafened: boolean;
};

export type DiscordChannel = {
    id: string;
    name: string;
    type: "text" | "voice";
    members?: number;
    voiceMembers?: DiscordVoiceMember[];
};

export type DiscordMember = {
    id: string;
    name: string;
    avatar: string;
    status: "online" | "idle" | "dnd" | "offline";
};

export type DiscordGuildInfo = {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    channels: DiscordChannel[];
    members: DiscordMember[];
};

type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: string };

function unwrap<T>(res: ApiEnvelope<T>): T {
    if (!res?.success) {
        throw new Error(res?.error ?? "Error en el servicio de Discord");
    }
    return res.data;
}

export const discordService = {
    async getStatus(): Promise<DiscordBotStatus> {
        const res = await api.get<ApiEnvelope<DiscordBotStatus>>("/api/v1/discord/status");
        return unwrap(res);
    },
    async getGuildInfo(guildId: string): Promise<DiscordGuildInfo> {
        const res = await api.get<ApiEnvelope<DiscordGuildInfo>>(`/api/v1/discord/guilds/${encodeURIComponent(guildId)}`);
        return unwrap(res);
    },
    async getInviteUrl(): Promise<string> {
        const res = await api.get<ApiEnvelope<{ url: string }>>("/api/v1/discord/invite");
        return unwrap(res).url;
    },
    async disconnectVoiceMember(guildId: string, userId: string): Promise<{ id: string; name: string }> {
        const res = await api.post<ApiEnvelope<{ id: string; name: string }>>(
            `/api/v1/discord/guilds/${encodeURIComponent(guildId)}/voice/${encodeURIComponent(userId)}/disconnect`,
            {},
        );
        return unwrap(res);
    },
    async setVoiceMute(guildId: string, userId: string, mute: boolean): Promise<{ id: string; name: string; muted: boolean }> {
        const res = await api.post<ApiEnvelope<{ id: string; name: string; muted: boolean }>>(
            `/api/v1/discord/guilds/${encodeURIComponent(guildId)}/voice/${encodeURIComponent(userId)}/mute`,
            { mute },
        );
        return unwrap(res);
    },
};
