import { defineModuleDev } from "@/dev/modules";

export default defineModuleDev({
  presets: [
    {
      entryId: "discord-widget",
      id: "community-live",
      name: "Community Live",
      config: {
        serverId: "guild-1",
      },
    },
    {
      entryId: "discord-widget",
      id: "needs-invite",
      name: "Needs Invite",
      config: {
        serverId: "guild-1",
      },
    },
  ],
});
