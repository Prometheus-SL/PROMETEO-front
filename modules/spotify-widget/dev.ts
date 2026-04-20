import { defineModuleDev } from "@/dev/modules/helpers";

export default defineModuleDev({
  presets: [
    {
      entryId: "spotify-widget",
      id: "playback",
      name: "Playback",
      config: {},
    },
    {
      entryId: "spotify-widget-compact",
      id: "compact",
      name: "Compact",
      config: {},
    },
    {
      entryId: "spotify-widget-queue",
      id: "queue",
      name: "Queue",
      config: {},
    },
  ],
});
