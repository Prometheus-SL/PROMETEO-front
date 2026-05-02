import type {
  ModuleConfigFieldDefinition,
  ModuleConfigUiDefinition,
} from "./types";

const COMMON_FIELDS: Record<string, ModuleConfigFieldDefinition> = {
  title: {
    label: "Widget title",
    helpText: "Shown in the widget header.",
    placeholder: "My widget",
  },
  name: {
    label: "Display name",
    helpText: "Optional name shown by this widget.",
    placeholder: "My widget",
  },
  pollMs: {
    label: "Refresh interval",
    helpText: "How often the widget refreshes its data.",
    section: "advanced",
    input: "slider",
    unit: "milliseconds",
    displayUnit: "seconds",
    min: 5_000,
    max: 300_000,
    step: 5_000,
  },
  refreshFallbackMs: {
    label: "Fallback refresh",
    helpText: "Used when live updates are unavailable.",
    section: "advanced",
    input: "slider",
    unit: "milliseconds",
    displayUnit: "seconds",
    min: 5_000,
    max: 120_000,
    step: 5_000,
  },
  refreshSecs: {
    label: "Refresh interval",
    helpText: "How often the widget refreshes its data.",
    section: "advanced",
    input: "slider",
    unit: "seconds",
    displayUnit: "seconds",
    min: 10,
    max: 3600,
    step: 10,
  },
  refreshSeconds: {
    label: "Refresh interval",
    helpText: "How often the widget refreshes its data.",
    section: "advanced",
    input: "slider",
    unit: "seconds",
    displayUnit: "seconds",
    min: 60,
    max: 180,
    step: 10,
  },
  refreshInterval: {
    label: "Refresh interval",
    helpText: "How often Prometeo refreshes the device state.",
    section: "advanced",
    input: "slider",
    unit: "seconds",
    displayUnit: "seconds",
    min: 1,
    max: 60,
    step: 1,
  },
  maxItems: {
    label: "Items to show",
    helpText: "Controls how dense the widget content should be.",
    input: "slider",
    unit: "items",
    min: 1,
    max: 12,
    step: 1,
  },
  limit: {
    label: "Conversations to show",
    helpText: "Maximum number of conversations in the widget.",
    input: "slider",
    unit: "items",
    min: 3,
    max: 20,
    step: 1,
  },
  messagesLimit: {
    label: "Messages to scan",
    helpText: "How many recent messages Prometeo reads per refresh.",
    section: "advanced",
    input: "slider",
    unit: "items",
    min: 10,
    max: 200,
    step: 10,
  },
  includeGroups: {
    label: "Include group chats",
    helpText: "Show group conversations alongside personal chats.",
    input: "switch",
  },
  city: {
    label: "City",
    helpText: "Location used by the weather widget.",
    placeholder: "Madrid",
  },
  units: {
    label: "Units",
    input: "segmented",
    options: [
      { value: "metric", label: "Metric" },
      { value: "imperial", label: "Imperial" },
    ],
  },
  language: {
    label: "Language",
    input: "segmented",
    options: [
      { value: "es", label: "Spanish" },
      { value: "en", label: "English" },
      { value: "fr", label: "French" },
      { value: "de", label: "German" },
    ],
  },
  leagueId: {
    label: "Competition",
    helpText: "League used for the standings and featured match summary.",
    input: "segmented",
    options: [
      { value: "laliga", label: "LaLiga" },
      { value: "champions", label: "Champions" },
    ],
  },
  teamName: {
    label: "Team",
    helpText: "Optional team name used for personalized match summaries.",
    placeholder: "Real Madrid",
  },
  apiKey: {
    label: "API key",
    helpText: "Stored with this widget config. Use Live preview only when you want to test it.",
    input: "secret",
    placeholder: "Paste API key",
  },
  apiToken: {
    label: "API token",
    helpText: "Stored with this widget config. Use Live preview only when you want to test it.",
    input: "secret",
    placeholder: "Paste API token",
  },
  groupFilter: {
    label: "Group filter",
    helpText: "Optional LIFX group name to focus this widget.",
    placeholder: "Desk",
  },
  serverId: {
    label: "Discord server",
    helpText: "Pick a server where the bot is installed, or enter an ID manually.",
    placeholder: "Select a server",
    input: "async-select",
    dynamicOptions: {
      source: "discord.guilds",
      placeholder: "Select a Discord server",
      loadingText: "Loading your Discord servers...",
      emptyText: "No manageable Discord servers were found.",
      errorText: "Could not load Discord servers.",
      manualText: "Enter server ID manually",
    },
  },
  channelId: {
    label: "Discord channel",
    helpText: "Pick a text channel from the selected server.",
    placeholder: "Select a channel",
    input: "async-select",
    dynamicOptions: {
      source: "discord.textChannels",
      dependsOn: ["serverId"],
      placeholder: "Select a text channel",
      loadingText: "Loading channels...",
      emptyText: "No text channels were found for this server.",
      errorText: "Could not load Discord channels.",
      blockedText: "Select a Discord server first.",
      manualText: "Enter channel ID manually",
    },
  },
  deviceIp: {
    label: "Device IP",
    helpText: "Local IP or hostname for the WLED device.",
    placeholder: "192.168.1.55",
  },
  useSsl: {
    label: "Use HTTPS",
    helpText: "Enable only if your WLED device is reachable over HTTPS.",
    input: "switch",
    section: "advanced",
  },
  ipAddress: {
    label: "Server address",
    helpText: "Minecraft server hostname or IP.",
    placeholder: "play.example.com",
  },
  port: {
    label: "Port",
    helpText: "Optional Minecraft server port.",
    section: "advanced",
    placeholder: "25565",
  },
  mode: {
    label: "Agent selection",
    helpText: "Auto uses the best available Hermes agent.",
    input: "segmented",
    options: [
      { value: "auto", label: "Auto" },
      { value: "agent", label: "Specific" },
    ],
  },
  agentId: {
    label: "Hermes agent",
    helpText: "Only needed when Agent selection is Specific.",
    section: "advanced",
    placeholder: "Select an agent",
    input: "async-select",
    dynamicOptions: {
      source: "hermes.agents",
      placeholder: "Select a Hermes agent",
      loadingText: "Loading Hermes agents...",
      emptyText: "No Hermes agents were found.",
      errorText: "Could not load Hermes agents.",
      manualText: "Enter agent ID manually",
    },
  },
  allowLocalEmbed: {
    label: "Allow local embed",
    helpText: "Let the now-playing widget hand off local embedded media.",
    input: "switch",
    section: "advanced",
  },
  color: {
    label: "Color",
    helpText: "Main accent color for Spark.",
    input: "color",
  },
  mood: {
    label: "Mood",
    input: "segmented",
    options: [
      { value: "happy", label: "Happy" },
      { value: "sleepy", label: "Sleepy" },
      { value: "angry", label: "Angry" },
      { value: "surprised", label: "Surprised" },
    ],
  },
  accessory: {
    label: "Accessory",
    input: "select",
    options: [
      { value: "none", label: "None" },
      { value: "glasses", label: "Glasses" },
      { value: "crown", label: "Crown" },
      { value: "antenna", label: "Antenna" },
      { value: "batman", label: "Batman" },
      { value: "spiderman", label: "Spiderman" },
      { value: "trescreus", label: "Tres Creus" },
    ],
  },
  autoMood: {
    label: "Automatic mood",
    helpText: "Let Spark react to idle time and available actions.",
    input: "switch",
  },
  pooEnabled: {
    label: "Playful effects",
    helpText: "Allow occasional decorative reactions.",
    input: "switch",
    section: "advanced",
  },
  pooMinDelayMs: {
    label: "Minimum effect delay",
    input: "slider",
    unit: "milliseconds",
    displayUnit: "seconds",
    section: "advanced",
    min: 10_000,
    max: 300_000,
    step: 5_000,
  },
  pooMaxDelayMs: {
    label: "Maximum effect delay",
    input: "slider",
    unit: "milliseconds",
    displayUnit: "seconds",
    section: "advanced",
    min: 10_000,
    max: 300_000,
    step: 5_000,
  },
  pooMaxCount: {
    label: "Effect limit",
    input: "slider",
    unit: "count",
    section: "advanced",
    min: 1,
    max: 8,
    step: 1,
  },
  inactivityMs: {
    label: "Idle threshold",
    input: "slider",
    unit: "milliseconds",
    displayUnit: "seconds",
    section: "advanced",
    min: 5_000,
    max: 120_000,
    step: 5_000,
  },
  inactivityStepMs: {
    label: "Idle mood cadence",
    input: "slider",
    unit: "milliseconds",
    displayUnit: "seconds",
    section: "advanced",
    min: 5_000,
    max: 120_000,
    step: 5_000,
  },
};

const PRODUCTIVITY: ModuleConfigUiDefinition = {
  id: "productivity-common",
  fields: COMMON_FIELDS,
  order: ["title", "maxItems", "pollMs"],
};

const DEFINITIONS: Record<string, Partial<ModuleConfigUiDefinition>> = {
  "calendar-agenda-widget": PRODUCTIVITY,
  "calendar-agenda-widget-compact": PRODUCTIVITY,
  "inbox-summary-widget": PRODUCTIVITY,
  "inbox-summary-widget-compact": PRODUCTIVITY,
  "github-pulse-widget": PRODUCTIVITY,
  "github-pulse-widget-compact": PRODUCTIVITY,
  "tasks-today-widget": PRODUCTIVITY,
  "tasks-today-widget-compact": PRODUCTIVITY,
  "creator-status-widget": {
    id: "creator-status-widget",
    fields: COMMON_FIELDS,
    order: ["title", "pollMs"],
  },
  "creator-status-widget-compact": {
    id: "creator-status-widget-compact",
    fields: COMMON_FIELDS,
    order: ["title", "pollMs"],
  },
  "weather-widget": {
    id: "weather-widget",
    fields: COMMON_FIELDS,
    order: ["city", "units", "language"],
  },
  "football-widget": {
    id: "football-widget",
    fields: COMMON_FIELDS,
    order: ["leagueId", "teamName"],
  },
  "football-widget-compact": {
    id: "football-widget-compact",
    fields: COMMON_FIELDS,
    order: ["leagueId", "teamName"],
  },
  "minecraft-widget": {
    id: "minecraft-widget",
    fields: COMMON_FIELDS,
    order: ["ipAddress", "name", "port", "refreshSecs"],
  },
  "discord-widget": {
    id: "discord-widget",
    fields: COMMON_FIELDS,
    order: ["serverId"],
    sampleConfig: { serverId: "guild-1" },
  },
  "lifx-widget": {
    id: "lifx-widget",
    fields: COMMON_FIELDS,
    order: ["apiToken", "groupFilter", "refreshInterval"],
  },
  "wled-controller": {
    id: "wled-controller",
    fields: COMMON_FIELDS,
    order: ["deviceIp", "useSsl", "refreshInterval"],
    sampleConfig: { deviceIp: "192.168.1.55" },
  },
  "wled-compact": {
    id: "wled-compact",
    fields: COMMON_FIELDS,
    order: ["deviceIp", "useSsl", "refreshInterval"],
    sampleConfig: { deviceIp: "192.168.1.55" },
  },
  "whatsapp-personal-widget": {
    id: "whatsapp-personal-widget",
    fields: COMMON_FIELDS,
    order: ["limit", "includeGroups", "refreshSeconds", "messagesLimit"],
  },
  "spark-widget": {
    id: "spark-widget",
    fields: COMMON_FIELDS,
    order: [
      "name",
      "color",
      "mood",
      "accessory",
      "autoMood",
      "pooEnabled",
      "pooMinDelayMs",
      "pooMaxDelayMs",
      "pooMaxCount",
      "inactivityMs",
      "inactivityStepMs",
    ],
  },
  "hermes-pc-widget": {
    id: "hermes-pc-widget",
    fields: {
      ...COMMON_FIELDS,
      title: {
        ...COMMON_FIELDS.title,
        defaultValue: "Hermes System",
      },
      refreshFallbackMs: {
        ...COMMON_FIELDS.refreshFallbackMs,
        defaultValue: 30_000,
      },
    },
    order: ["mode", "agentId", "title", "refreshFallbackMs"],
  },
  "hermes-now-playing-widget": {
    id: "hermes-now-playing-widget",
    fields: {
      ...COMMON_FIELDS,
      title: {
        ...COMMON_FIELDS.title,
        defaultValue: "Hermes Now Playing",
      },
    },
    order: ["mode", "agentId", "title", "allowLocalEmbed", "refreshFallbackMs"],
  },
  "hermes-volume-widget": {
    id: "hermes-volume-widget",
    fields: {
      ...COMMON_FIELDS,
      title: {
        ...COMMON_FIELDS.title,
        defaultValue: "Hermes Volume",
      },
    },
    order: ["mode", "agentId", "title", "refreshFallbackMs"],
  },
  "spotify-widget": {
    id: "spotify-widget",
    fields: COMMON_FIELDS,
  },
  "spotify-widget-compact": {
    id: "spotify-widget-compact",
    fields: COMMON_FIELDS,
  },
  "spotify-widget-queue": {
    id: "spotify-widget-queue",
    fields: COMMON_FIELDS,
  },
};

export function getModuleConfigUiDefinition(
  moduleId: string,
): ModuleConfigUiDefinition {
  const definition = DEFINITIONS[moduleId];

  return {
    id: definition?.id ?? moduleId,
    fields: {
      ...COMMON_FIELDS,
      ...(definition?.fields ?? {}),
    },
    order: definition?.order,
    sampleConfig: definition?.sampleConfig,
  };
}

export function getFieldDefinition(
  moduleId: string,
  key: string,
): ModuleConfigFieldDefinition | undefined {
  return getModuleConfigUiDefinition(moduleId).fields[key];
}

export function hasExplicitFieldDefinition(moduleId: string, key: string) {
  return Boolean(getFieldDefinition(moduleId, key));
}
