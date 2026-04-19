import {
  discordService,
  type DiscordChannel,
  type DiscordManagedGuild,
} from "@/services/discord";

import {
  listMyHermesAgents,
  type HermesAgent,
} from "../../../modules/hermes-widget/hermes-service";
import type {
  ModuleConfigDynamicOptions,
  ModuleConfigOption,
} from "./types";

type DynamicOptionLoaderContext = {
  value: Record<string, unknown>;
  dependencies: Record<string, string>;
  signal?: AbortSignal;
};

export type DynamicOptionLoader = (
  context: DynamicOptionLoaderContext,
) => Promise<ModuleConfigOption[]>;

export type DynamicOptionsResult =
  | {
      status: "blocked";
      options: [];
      missingDependencies: string[];
    }
  | {
      status: "ready";
      options: ModuleConfigOption[];
      missingDependencies: [];
    };

const statusLabel: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  stale: "Stale",
  unknown: "Unknown",
};

function compact(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" - ");
}

function dependencyValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function getDependencyValues(
  definition: ModuleConfigDynamicOptions,
  value: Record<string, unknown>,
) {
  return (definition.dependsOn ?? []).reduce<Record<string, string>>(
    (result, key) => {
      result[key] = dependencyValue(value[key]);
      return result;
    },
    {},
  );
}

export function getMissingDynamicOptionDependencies(
  definition: ModuleConfigDynamicOptions,
  value: Record<string, unknown>,
) {
  return (definition.dependsOn ?? []).filter(
    (key) => !dependencyValue(value[key]),
  );
}

function cacheKey(
  definition: ModuleConfigDynamicOptions,
  dependencies: Record<string, string>,
) {
  const entries = Object.entries(dependencies).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return JSON.stringify([definition.source, entries]);
}

export function createDynamicOptionResolver(
  loaders: Record<string, DynamicOptionLoader>,
) {
  const cache = new Map<string, Promise<ModuleConfigOption[]>>();

  return {
    async resolve(
      definition: ModuleConfigDynamicOptions,
      value: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<DynamicOptionsResult> {
      const missingDependencies = getMissingDynamicOptionDependencies(
        definition,
        value,
      );

      if (missingDependencies.length > 0) {
        return {
          status: "blocked",
          options: [],
          missingDependencies,
        };
      }

      const loader = loaders[definition.source];
      if (!loader) {
        throw new Error(`No dynamic option loader registered for ${definition.source}`);
      }

      const dependencies = getDependencyValues(definition, value);
      const key = cacheKey(definition, dependencies);
      const existing = cache.get(key);

      if (existing) {
        return {
          status: "ready",
          options: await existing,
          missingDependencies: [],
        };
      }

      const promise = loader({ value, dependencies, signal }).catch((error) => {
        cache.delete(key);
        throw error;
      });
      cache.set(key, promise);

      return {
        status: "ready",
        options: await promise,
        missingDependencies: [],
      };
    },
    clear() {
      cache.clear();
    },
  };
}

export function mapDiscordGuildOptions(
  guilds: DiscordManagedGuild[],
): ModuleConfigOption[] {
  return guilds.map((guild) => ({
    value: guild.id,
    label: guild.name || guild.id,
    description: compact([
      guild.isOwner ? "Owner" : guild.isAdmin ? "Admin" : null,
      guild.botPresent ? "Bot installed" : "Bot not installed",
    ]),
    badge: guild.botPresent ? "Ready" : "Invite bot",
    disabled: guild.botPresent ? undefined : true,
  }));
}

export function mapDiscordChannelOptions(
  channels: DiscordChannel[],
): ModuleConfigOption[] {
  return channels
    .filter((channel) => channel.type === "text")
    .map((channel) => ({
      value: channel.id,
      label: `#${channel.name}`,
      description: "Text channel",
    }));
}

export function mapHermesAgentOptions(agents: HermesAgent[]): ModuleConfigOption[] {
  return agents.map((agent) => {
    const hostname = agent.computerInfo?.hostname;
    const ipAddress = agent.computerInfo?.network?.ip;
    const status = statusLabel[agent.status] ?? agent.status;

    return {
      value: agent.agentId,
      label: agent.name || hostname || agent.agentId,
      description: compact([hostname, ipAddress]),
      badge: status,
    };
  });
}

export const dynamicOptionResolver = createDynamicOptionResolver({
  "discord.guilds": async () => {
    const response = await discordService.getMyGuilds();
    return mapDiscordGuildOptions(response.guilds ?? []);
  },
  "discord.textChannels": async ({ dependencies }) => {
    const guild = await discordService.getGuildInfo(dependencies.serverId);
    return mapDiscordChannelOptions(guild.channels ?? []);
  },
  "hermes.agents": async () => mapHermesAgentOptions(await listMyHermesAgents()),
});

export function loadDynamicOptions(
  definition: ModuleConfigDynamicOptions,
  value: Record<string, unknown>,
  signal?: AbortSignal,
) {
  return dynamicOptionResolver.resolve(definition, value, signal);
}
