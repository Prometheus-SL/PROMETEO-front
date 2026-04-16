import { defineModuleDev } from "@/dev/modules";

export default defineModuleDev({
  presets: [
    {
      entryId: "action-center-widget",
      id: "ready",
      name: "Ready",
      config: {
        title: "Action Center",
        maxActions: 6,
      },
    },
    {
      entryId: "action-center-widget-compact",
      id: "compact",
      name: "Compact",
      config: {
        title: "Quick Actions",
        maxActions: 4,
        showWidgetIds: false,
      },
    },
    {
      entryId: "action-center-widget",
      id: "empty",
      name: "Empty",
      config: {
        title: "Action Center",
      },
    },
  ],
});
