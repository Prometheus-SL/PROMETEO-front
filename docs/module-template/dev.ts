import { defineModuleDev } from "@/dev/modules";

export default defineModuleDev({
  presets: [
    {
      entryId: "your-widget",
      id: "default",
      name: "Default",
      config: {
        title: "Your Widget",
        subtitle: "A simple preset for the happy path.",
        value: "42",
        status: "ready",
        showSecondaryNote: true,
      },
    },
    {
      entryId: "your-widget",
      id: "warning",
      name: "Warning",
      config: {
        title: "Your Widget",
        subtitle: "A second preset to preview an alternate state.",
        value: "Check me",
        status: "warning",
        showSecondaryNote: false,
      },
    },
  ],
});
