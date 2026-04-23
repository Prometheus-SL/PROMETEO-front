import { HttpResponse, http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";
import type {
  DiscordBotStatus,
  DiscordChannel,
  DiscordEpicNotificationConfig,
  DiscordGuildInfo,
  DiscordMember,
  DiscordVoiceMember,
  DiscordSpotifyArtist,
  DiscordArtistReleaseType,
  DiscordArtistSubscription,
  DiscordArtistReleasesConfig,
} from "@/services/discord";

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

const epicNotificationConfigSchema = z.object({
  guildId: z.string(),
  channelId: z.string().nullable(),
  enabled: z.boolean(),
  lastNotifiedAt: z.string().nullable(),
  lastError: z.string().nullable(),
});

const artistSubscriptionSchema = z.object({
  artistId: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
});

const artistReleasesConfigSchema = z.object({
  guildId: z.string(),
  channelId: z.string().nullable(),
  enabled: z.boolean(),
  includeTypes: z.array(z.enum(['album', 'single', 'compilation', 'appears_on'])),
  subscriptions: z.array(artistSubscriptionSchema),
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
  epicNotifications: z.array(epicNotificationConfigSchema).default([]),
  artistReleases: z.array(artistReleasesConfigSchema).default([]),
  permissions: z
    .object({
      isAdmin: z.boolean(),
      isOwner: z.boolean(),
      hasLinkedDiscord: z.boolean(),
    })
    .default({ isAdmin: true, isOwner: false, hasLinkedDiscord: true }),
  inviteUrl: z
    .string()
    .default(
      "https://discord.com/oauth2/authorize?client_id=000000000000000000&scope=bot&permissions=8",
    ),
});

type DiscordMockState = z.infer<typeof discordMockStateSchema>;

function buildHandlers(state: DiscordMockState) {
  const live = {
    botConnected: state.botConnected,
    botUser: state.botUser as DiscordBotStatus["user"],
    guilds: state.guilds as DiscordBotStatus["guilds"],
    channels: state.channels as DiscordChannel[],
    members: state.members as DiscordMember[],
    epicNotifications: state.epicNotifications as DiscordEpicNotificationConfig[],
    artistReleases: state.artistReleases as DiscordArtistReleasesConfig[],
    permissions: state.permissions,
    inviteUrl: state.inviteUrl,
  };

  return [
    http.get(createModuleDevBackendUrl("/api/v1/discord/status"), () =>
      createModuleDevSuccessResponse<DiscordBotStatus>({
        connected: live.botConnected,
        user: live.botUser,
        guilds: live.guilds,
      }),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/discord/guilds/:guildId"), ({ params }) => {
      const guild = live.guilds.find((item) => item.id === params.guildId);
      if (!guild) {
        return HttpResponse.json(
          { success: false, message: "Guild not found" },
          { status: 404 },
        );
      }

      return createModuleDevSuccessResponse<DiscordGuildInfo>({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.memberCount,
        channels: live.channels,
        members: live.members,
      });
    }),
    http.get(createModuleDevBackendUrl("/api/v1/discord/invite"), () =>
      createModuleDevSuccessResponse({ url: live.inviteUrl }),
    ),
    http.post(
      createModuleDevBackendUrl("/api/v1/discord/guilds/:guildId/voice/:userId/disconnect"),
      ({ params }) => {
        const userId = String(params.userId ?? "");
        for (const channel of live.channels) {
          if (channel.voiceMembers) {
            const index = channel.voiceMembers.findIndex((member) => member.id === userId);
            if (index !== -1) {
              const [removed] = channel.voiceMembers.splice(index, 1);
              channel.members = channel.voiceMembers.length;
              return createModuleDevSuccessResponse({
                id: removed.id,
                name: removed.name,
              });
            }
          }
        }

        return createModuleDevSuccessResponse({ id: userId, name: "unknown" });
      },
    ),
    http.post(
      createModuleDevBackendUrl("/api/v1/discord/guilds/:guildId/voice/:userId/mute"),
      async ({ params, request }) => {
        const userId = String(params.userId ?? "");
        const payload = (await request.json()) as { mute?: boolean };
        const mute = Boolean(payload.mute);

        let target: DiscordVoiceMember | undefined;
        for (const channel of live.channels) {
          target = channel.voiceMembers?.find((member) => member.id === userId);
          if (target) break;
        }

        if (target) {
          target.muted = mute;
          return createModuleDevSuccessResponse({
            id: target.id,
            name: target.name,
            muted: mute,
          });
        }

        return createModuleDevSuccessResponse({
          id: userId,
          name: "unknown",
          muted: mute,
        });
      },
    ),
    http.get(
      createModuleDevBackendUrl("/api/v1/discord/guilds/:guildId/me/permissions"),
      ({ params }) => {
        const guild = live.guilds.find((item) => item.id === params.guildId);
        if (!guild) {
          return HttpResponse.json(
            { success: false, message: "El bot no está en ese servidor" },
            { status: 404 },
          );
        }
        return createModuleDevSuccessResponse(live.permissions);
      },
    ),
    http.get(createModuleDevBackendUrl("/api/v1/discord/my-guilds"), () =>
      createModuleDevSuccessResponse({
        needsLink: false,
        needsReauth: false,
        guilds: live.guilds.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          isAdmin: live.permissions.isAdmin,
          isOwner: live.permissions.isOwner,
          hasLinkedDiscord: live.permissions.hasLinkedDiscord,
          botPresent: true,
        })),
      }),
    ),
    http.get(createModuleDevBackendUrl("/api/v1/discord/notifications/epic"), () =>
      createModuleDevSuccessResponse({ configs: live.epicNotifications }),
    ),
    http.post(
      createModuleDevBackendUrl("/api/v1/discord/notifications/epic"),
      async ({ request }) => {
        const payload = (await request.json()) as {
          configs?: Array<{ guildId: string; channelId: string | null; enabled: boolean }>;
        };
        const incoming = Array.isArray(payload.configs) ? payload.configs : [];
        live.epicNotifications = incoming.map((c) => ({
          guildId: c.guildId,
          channelId: c.channelId ?? null,
          enabled: Boolean(c.enabled),
          lastNotifiedAt: null,
          lastError: null,
        }));

        return createModuleDevSuccessResponse({
          configs: live.epicNotifications,
          warning: null,
        });
      },
    ),
    http.get(createModuleDevBackendUrl("/api/v1/discord/artists/search"), ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get("q") || "";
      const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 10);

      if (q.length < 2) {
        return createModuleDevSuccessResponse<{ results: DiscordSpotifyArtist[] }>({
          results: [],
        });
      }

      const mockArtists: DiscordSpotifyArtist[] = [
        {
          id: "06HL4z0CvFAxyc27GXpf94",
          name: "Taylor Swift",
          imageUrl: "https://i.scdn.co/image/ab6761610000e5eb8e3f5fd1a66f8d8a48b32e3a",
        },
        {
          id: "04gDigrS5kc9YWfZbgWsB8",
          name: "The Weeknd",
          imageUrl: "https://i.scdn.co/image/ab6761610000e5eb87f7bbf0e36e3e76fa4b6e42",
        },
        {
          id: "1vCWHaC5f2uS3yhpwWbq5a",
          name: "Ariana Grande",
          imageUrl: "https://i.scdn.co/image/ab6761610000e5eb1ea4fd858e4de59c3c570b0c",
        },
        {
          id: "74ASZWbe4lXaubB0YVgXjB",
          name: "Post Malone",
          imageUrl: "https://i.scdn.co/image/ab6761610000e5ebd0e1e25fa85d70e6c3b1a0f4",
        },
        {
          id: "1HY2Jd0NmPuamShAr6KMms",
          name: "Drake",
          imageUrl: "https://i.scdn.co/image/ab6761610000e5ebe65207802f4a41ed7f96e901",
        },
      ];

      const filtered = mockArtists.filter((a) =>
        a.name.toLowerCase().includes(q.toLowerCase()),
      );

      return createModuleDevSuccessResponse<{ results: DiscordSpotifyArtist[] }>({
        results: filtered.slice(0, limit),
      });
    }),
    http.get(createModuleDevBackendUrl("/api/v1/discord/notifications/artist-releases"), () =>
      createModuleDevSuccessResponse({
        configs: live.artistReleases,
        needsLink: false,
        needsReauth: false,
      }),
    ),
    http.post(
      createModuleDevBackendUrl("/api/v1/discord/notifications/artist-releases"),
      async ({ request }) => {
        const payload = (await request.json()) as {
          configs?: Array<{
            guildId: string;
            channelId: string | null;
            enabled: boolean;
            includeTypes: DiscordArtistReleaseType[];
            subscriptions: Array<{ artistId: string }>;
          }>;
        };
        const incoming = Array.isArray(payload.configs) ? payload.configs : [];
        live.artistReleases = incoming.map((c) => ({
          guildId: c.guildId,
          channelId: c.channelId ?? null,
          enabled: Boolean(c.enabled),
          includeTypes: c.includeTypes || ["album", "single"],
          subscriptions: c.subscriptions || [],
        }));

        return createModuleDevSuccessResponse({
          configs: live.artistReleases,
          warning: null,
          needsLink: false,
          needsReauth: false,
        });
      },
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<DiscordMockState>({
  stateSchema: discordMockStateSchema,
  buildHandlers,
});

export default adapter;
