import { http } from "msw";
import { z } from "zod";

import {
  createModuleDevBackendUrl,
  createModuleDevSuccessResponse,
  createMswModuleDevMockAdapter,
} from "@/dev/modules";
import type { SteamFriendsPresence } from "@/services/steam";

const steamFriendSchema = z.object({
  steamId: z.string(),
  personaName: z.string(),
  personaState: z.number().default(1),
  personaStateLabel: z.string().default("online"),
  avatarUrl: z.string().nullable().default(null),
  profileUrl: z.string().nullable().default(null),
  game: z
    .object({
      appId: z.string().nullable().default(null),
      name: z.string(),
    })
    .nullable()
    .default(null),
});

const steamFriendsMockStateSchema = z.object({
  friends: z
    .array(steamFriendSchema)
    .default([
      {
        steamId: "76561198000000002",
        personaName: "Rhea",
        personaState: 1,
        personaStateLabel: "online",
        avatarUrl: null,
        profileUrl: "https://steamcommunity.com/profiles/76561198000000002",
        game: { appId: "730", name: "Counter-Strike 2" },
      },
      {
        steamId: "76561198000000003",
        personaName: "Noa",
        personaState: 3,
        personaStateLabel: "away",
        avatarUrl: null,
        profileUrl: "https://steamcommunity.com/profiles/76561198000000003",
        game: null,
      },
    ]),
});

type SteamFriendsMockState = z.infer<typeof steamFriendsMockStateSchema>;

function buildHandlers(state: SteamFriendsMockState) {
  const friends = state.friends;
  const summary: SteamFriendsPresence = {
    provider: { status: "connected" },
    profile: {
      steamId: "76561198000000001",
      personaName: "Prometeo",
      displayName: "Prometeo",
    },
    friends,
    onlineCount: friends.filter((friend) => friend.personaState > 0).length,
    playingCount: friends.filter((friend) => Boolean(friend.game)).length,
    totalFriends: 42,
    inspectedCount: 42,
  };

  return [
    http.get(createModuleDevBackendUrl("/api/v1/integrations/steam/friends"), () =>
      createModuleDevSuccessResponse(summary),
    ),
  ];
}

const adapter = createMswModuleDevMockAdapter<SteamFriendsMockState>({
  stateSchema: steamFriendsMockStateSchema,
  buildHandlers,
});

export default adapter;
