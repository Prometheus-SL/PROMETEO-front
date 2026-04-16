import { defineModuleDev } from "@/dev/modules";

export default defineModuleDev({
  presets: [
    {
      entryId: "spotify-widget",
      id: "playback",
      name: "Playback",
    },
    {
      entryId: "spotify-widget-compact",
      id: "compact",
      name: "Compact",
    },
    {
      entryId: "spotify-widget-queue",
      id: "queue",
      name: "Queue",
    },
    {
      entryId: "spotify-widget",
      id: "unconfigured",
      name: "Unconfigured",
      config: {},
    },
  ],
});
