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
  DiscordEpicNotifications,
  DiscordGuildInfo,
  DiscordMember,
  DiscordVoiceMember,
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

function buildHandlers(state: DiscordMockState) {
  const live = {
    botConnected: state.botConnected,
    botUser: state.botUser as DiscordBotStatus["user"],
    guilds: state.guilds as DiscordBotStatus["guilds"],
    channels: state.channels as DiscordChannel[],
    members: state.members as DiscordMember[],
    epicNotifications: state.epicNotifications as DiscordEpicNotifications,
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
    http.get(createModuleDevBackendUrl("/api/v1/discord/notifications/epic"), () =>
      createModuleDevSuccessResponse(live.epicNotifications),
    ),
    http.post(
      createModuleDevBackendUrl("/api/v1/discord/notifications/epic"),
      async ({ request }) => {
        const payload = (await request.json()) as {
          enabled?: boolean;
          channelId?: string | null;
          guildId?: string | null;
        };

        live.epicNotifications = {
          ...live.epicNotifications,
          enabled: payload.enabled ?? live.epicNotifications.enabled,
          channelId:
            payload.channelId !== undefined
              ? payload.channelId
              : live.epicNotifications.channelId,
          guildId:
            payload.guildId !== undefined
              ? payload.guildId
              : live.epicNotifications.guildId,
        };

        return createModuleDevSuccessResponse({
          state: live.epicNotifications,
          warning: null,
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
