import { describe, expect, it, vi } from "vitest";

import {
  createDynamicOptionResolver,
  mapDiscordChannelOptions,
  mapDiscordGuildOptions,
  mapHermesAgentOptions,
} from "../src/modules/config/dynamic-options";
import type {
  ModuleConfigDynamicOptions,
  ModuleConfigOption,
} from "../src/modules/config/types";

describe("module config dynamic options", () => {
  it("blocks dependent loaders until required config values exist", async () => {
    const load = vi.fn<() => Promise<ModuleConfigOption[]>>();
    const resolver = createDynamicOptionResolver({
      "discord.textChannels": async () => load(),
    });
    const definition: ModuleConfigDynamicOptions = {
      source: "discord.textChannels",
      dependsOn: ["serverId"],
    };

    const result = await resolver.resolve(definition, { serverId: "" });

    expect(result).toEqual({
      status: "blocked",
      options: [],
      missingDependencies: ["serverId"],
    });
    expect(load).not.toHaveBeenCalled();
  });

  it("caches loaded options per source and dependency values", async () => {
    const load = vi.fn(
      async ({ dependencies }: { dependencies: Record<string, string> }) => [
        {
          value: dependencies.serverId,
          label: `Server ${dependencies.serverId}`,
        },
      ],
    );
    const resolver = createDynamicOptionResolver({
      "discord.textChannels": load,
    });
    const definition: ModuleConfigDynamicOptions = {
      source: "discord.textChannels",
      dependsOn: ["serverId"],
    };

    await resolver.resolve(definition, { serverId: "guild-1" });
    await resolver.resolve(definition, { serverId: "guild-1" });
    await resolver.resolve(definition, { serverId: "guild-2" });

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("maps Discord guilds into polished selectable options", () => {
    const options = mapDiscordGuildOptions([
      {
        id: "guild-1",
        name: "Prometeo Lab",
        icon: null,
        isAdmin: true,
        isOwner: false,
        hasLinkedDiscord: true,
        botPresent: true,
      },
      {
        id: "guild-2",
        name: "Archive",
        icon: null,
        isAdmin: false,
        isOwner: false,
        hasLinkedDiscord: true,
        botPresent: false,
      },
    ]);

    expect(options).toEqual([
      {
        value: "guild-1",
        label: "Prometeo Lab",
        description: "Admin - Bot installed",
        badge: "Ready",
      },
      {
        value: "guild-2",
        label: "Archive",
        description: "Bot not installed",
        badge: "Invite bot",
        disabled: true,
      },
    ]);
  });

  it("maps Discord channels and Hermes agents for future module fields", () => {
    expect(
      mapDiscordChannelOptions([
        { id: "text-1", name: "general", type: "text" },
        { id: "voice-1", name: "Hangout", type: "voice" },
      ]),
    ).toEqual([
      {
        value: "text-1",
        label: "#general",
        description: "Text channel",
      },
    ]);

    expect(
      mapHermesAgentOptions([
        {
          _id: "mongo-1",
          agentId: "desk-pc",
          name: "Studio PC",
          status: "online",
          computerInfo: {
            hostname: "studio",
            network: { ip: "192.168.1.20" },
          },
        },
      ]),
    ).toEqual([
      {
        value: "desk-pc",
        label: "Studio PC",
        description: "studio - 192.168.1.20",
        badge: "Online",
      },
    ]);
  });
});
