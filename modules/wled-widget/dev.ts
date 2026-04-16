import { defineModuleDev } from "@/dev/modules";

export default defineModuleDev({
  presets: [
    {
      entryId: "wled-controller",
      id: "ready",
      name: "Ready",
      config: {
        deviceIp: "192.168.1.55",
      },
    },
    {
      entryId: "wled-compact",
      id: "compact",
      name: "Compact",
      config: {
        deviceIp: "192.168.1.55",
      },
    },
    {
      entryId: "wled-controller",
      id: "offline",
      name: "Offline",
      config: {
        deviceIp: "",
      },
    },
  ],
});
