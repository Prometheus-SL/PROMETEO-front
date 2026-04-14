import { describe, expect, it } from "vitest";

import { validateModuleMeta } from "../src/modules/validation";
import {
  getModuleAvailability,
  isModuleVisibleOnSurface,
} from "../src/modules/access";

describe("module metadata", () => {
  it("applies defaults for extended marketplace metadata", () => {
    const meta = validateModuleMeta({
      id: "spotify-widget",
      name: "Spotify",
      entry: "./index.tsx",
      size: { width: 2, height: 2 },
    });

    expect(meta.audience).toBe("dashboard");
    expect(meta.requiredProviders).toEqual([]);
    expect(meta.capabilities).toEqual([]);
    expect(meta.requiredRole).toBeNull();
  });

  it("hides ops modules from the client surface and reports missing providers", () => {
    const meta = validateModuleMeta({
      id: "command-center-widget",
      name: "Command Center",
      entry: "./index.tsx",
      size: { width: 2, height: 2 },
      audience: "ops",
      requiredProviders: ["spotify"],
      requiredRole: "operator",
      capabilities: ["actions"],
    });

    expect(isModuleVisibleOnSurface(meta, "client")).toBe(false);

    const availability = getModuleAvailability(meta, {
      surface: "dashboard",
      role: "user",
      linkedProviders: {
        spotify: { status: "disconnected" },
      },
    });

    expect(availability.missingProviders).toEqual(["spotify"]);
    expect(availability.hasRequiredRole).toBe(false);
    expect(availability.canInstall).toBe(false);
  });
});
