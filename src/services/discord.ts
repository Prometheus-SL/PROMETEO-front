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

export type DiscordPermissions = {
    isAdmin: boolean;
    isOwner: boolean;
    hasLinkedDiscord: boolean;
};

export type DiscordManagedGuild = {
    id: string;
    name: string;
    icon: string | null;
    isAdmin: boolean;
    isOwner: boolean;
    hasLinkedDiscord: boolean;
    botPresent: boolean;
};

export type DiscordMyGuildsResponse = {
    needsLink: boolean;
    needsReauth: boolean;
    guilds: DiscordManagedGuild[];
    rateLimited?: boolean;
};

export type DiscordEpicNotificationConfig = {
    guildId: string;
    channelId: string | null;
    enabled: boolean;
    lastNotifiedAt: string | null;
    lastError: string | null;
    updatedBy?: string | null;
    updatedAt?: string | null;
};

export type DiscordEpicNotificationsState = {
    configs: DiscordEpicNotificationConfig[];
    needsLink?: boolean;
    needsReauth?: boolean;
};

export type DiscordEpicNotificationsUpdatePayload = {
    configs: Array<{ guildId: string; channelId: string | null; enabled: boolean }>;
};

export type DiscordEpicNotificationsUpdateResult = {
    configs: DiscordEpicNotificationConfig[];
    warning: string | null;
};

export type DiscordSteamGame = { appId: number; name: string };

export type DiscordGameUpdateSubscription = {
    appId: number;
    name: string;
    lastNotifiedAt: string | null;
    lastError: string | null;
};

export type DiscordGameUpdatesConfig = {
    guildId: string;
    channelId: string | null;
    enabled: boolean;
    subscriptions: DiscordGameUpdateSubscription[];
    updatedBy?: string | null;
    updatedAt?: string | null;
};

export type DiscordGameUpdatesState = {
    configs: DiscordGameUpdatesConfig[];
    needsLink?: boolean;
    needsReauth?: boolean;
};

export type DiscordGameUpdatesUpdatePayload = {
    configs: Array<{
        guildId: string;
        channelId: string | null;
        enabled: boolean;
        subscriptions: Array<{ appId: number }>;
    }>;
};

export type DiscordGameUpdatesUpdateResult = {
    configs: DiscordGameUpdatesConfig[];
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
    async getMyPermissions(guildId: string): Promise<DiscordPermissions> {
        return api.getData<DiscordPermissions>(
            `/api/v1/discord/guilds/${encodeURIComponent(guildId)}/me/permissions`,
        );
    },
    async getMyGuilds(): Promise<DiscordMyGuildsResponse> {
        return api.getData<DiscordMyGuildsResponse>("/api/v1/discord/my-guilds");
    },
    async getEpicNotifications(): Promise<DiscordEpicNotificationsState> {
        return api.getData<DiscordEpicNotificationsState>("/api/v1/discord/notifications/epic");
    },
    async setEpicNotifications(
        payload: DiscordEpicNotificationsUpdatePayload,
    ): Promise<DiscordEpicNotificationsUpdateResult> {
        return api.postData<DiscordEpicNotificationsUpdateResult>(
            "/api/v1/discord/notifications/epic",
            payload,
        );
    },
    async searchGames(query: string, limit = 20): Promise<DiscordSteamGame[]> {
        const trimmed = query.trim();
        if (trimmed.length < 2) return [];
        const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
        const data = await api.getData<{ results: DiscordSteamGame[] }>(
            `/api/v1/discord/games/search?${params.toString()}`,
        );
        return Array.isArray(data.results) ? data.results : [];
    },
    async getGameUpdates(): Promise<DiscordGameUpdatesState> {
        return api.getData<DiscordGameUpdatesState>("/api/v1/discord/notifications/game-updates");
    },
    async setGameUpdates(
        payload: DiscordGameUpdatesUpdatePayload,
    ): Promise<DiscordGameUpdatesUpdateResult> {
        return api.postData<DiscordGameUpdatesUpdateResult>(
            "/api/v1/discord/notifications/game-updates",
            payload,
        );
    },
};
