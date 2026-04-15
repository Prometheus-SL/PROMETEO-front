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
    streaming: boolean;
    video: boolean;
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

export type DiscordEpicNotifications = {
    enabled: boolean;
    channelId: string | null;
    guildId: string | null;
    lastNotifiedAt: string | null;
    lastError: string | null;
};

export type DiscordEpicNotificationsUpdateResult = {
    state: DiscordEpicNotifications;
    warning: string | null;
};

export const discordService = {
    async getStatus(): Promise<DiscordBotStatus> {
        return api.getData<DiscordBotStatus>("/api/v1/discord/status");
    },
    async getGuildInfo(guildId: string): Promise<DiscordGuildInfo> {
        return api.getData<DiscordGuildInfo>(`/api/v1/discord/guilds/${encodeURIComponent(guildId)}`);
    },
    async getInviteUrl(): Promise<string> {
        const data = await api.getData<{ url: string }>("/api/v1/discord/invite");
        return data.url;
    },
    async disconnectVoiceMember(guildId: string, userId: string): Promise<{ id: string; name: string }> {
        return api.postData<{ id: string; name: string }>(
            `/api/v1/discord/guilds/${encodeURIComponent(guildId)}/voice/${encodeURIComponent(userId)}/disconnect`,
            {}
        );
    },
    async setVoiceMute(guildId: string, userId: string, mute: boolean): Promise<{ id: string; name: string; muted: boolean }> {
        return api.postData<{ id: string; name: string; muted: boolean }>(
            `/api/v1/discord/guilds/${encodeURIComponent(guildId)}/voice/${encodeURIComponent(userId)}/mute`,
            { mute }
        );
    },
    async getEpicNotifications(): Promise<DiscordEpicNotifications> {
        return api.getData<DiscordEpicNotifications>("/api/v1/discord/notifications/epic");
    },
    async setEpicNotifications(payload: {
        enabled: boolean;
        channelId: string | null;
        guildId: string | null;
    }): Promise<DiscordEpicNotificationsUpdateResult> {
        return api.postData<DiscordEpicNotificationsUpdateResult>(
            "/api/v1/discord/notifications/epic",
            payload,
        );
    },
};
