import { describe, expect, it } from "vitest";

import { validateModuleMeta } from "../src/modules/validation";
import {
  getModuleAvailability,
  isModuleVisibleOnSurface,
  type ModuleAvailability,
} from "../src/modules/access";
import {
  filterMarketplaceFamilies,
  groupMarketplaceFamilies,
  resolveMarketplaceMeta,
} from "../src/modules/catalog";
import type { ModuleMeta } from "../src/modules/types";

describe("module metadata", () => {
  it("applies defaults for extended marketplace metadata", () => {
    const meta = validateModuleMeta({
      id: "spotify-widget",
      name: "Spotify",
      entry: "./index.tsx",
      size: { width: 2, height: 2 },
      marketplace: {
        familyId: "spotify",
        familyName: "Spotify Now Playing",
        variantLabel: "Standard",
        variantOrder: 1,
      },
    });

    expect(meta.audience).toBe("dashboard");
    expect(meta.requiredProviders).toEqual([]);
    expect(meta.capabilities).toEqual([]);
    expect(meta.requiredRole).toBeNull();
    expect(meta.marketplace).toEqual({
      familyId: "spotify",
      familyName: "Spotify Now Playing",
      variantLabel: "Standard",
      variantOrder: 1,
    });
  });

  it("accepts ai action metadata declared by widgets", () => {
    const meta = validateModuleMeta({
      id: "spotify-widget",
      name: "Spotify",
      entry: "./index.tsx",
      size: { width: 2, height: 2 },
      ai: {
        actions: ["spotify.status", "spotify.play", "spotify.pause"],
      },
    });

    expect(meta.ai).toEqual({
      actions: ["spotify.status", "spotify.play", "spotify.pause"],
    });
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

describe("marketplace catalogue grouping", () => {
  const ready: ModuleAvailability = {
    audience: "dashboard",
    missingProviders: [],
    hasRequiredRole: true,
    isVisibleOnSurface: true,
    canInstall: true,
  };

  const needsGoogle: ModuleAvailability = {
    ...ready,
    missingProviders: ["google"],
    canInstall: false,
  };

  function module(meta: Partial<ModuleMeta> & Pick<ModuleMeta, "id" | "name">): ModuleMeta {
    return {
      entry: "./index.tsx",
      size: { width: 2, height: 2 },
      ...meta,
    };
  }

  it("uses stable defaults when marketplace grouping metadata is absent", () => {
    expect(
      resolveMarketplaceMeta(
        module({
          id: "weather-widget",
          name: "Weather Widget",
        }),
      ),
    ).toEqual({
      familyId: "weather-widget",
      familyName: "Weather Widget",
      variantLabel: "Default",
      variantOrder: 0,
    });
  });

  it("groups explicit variants without grouping unrelated modules from the same folder", () => {
    const families = groupMarketplaceFamilies(
      [
        module({
          id: "spotify-widget",
          name: "Spotify Now Playing",
          marketplace: {
            familyId: "spotify",
            familyName: "Spotify Now Playing",
            variantLabel: "Standard",
            variantOrder: 2,
          },
        }),
        module({
          id: "spotify-widget-compact",
          name: "Spotify Now Playing (Compact)",
          size: { width: 2, height: 1 },
          marketplace: {
            familyId: "spotify",
            familyName: "Spotify Now Playing",
            variantLabel: "Compact",
            variantOrder: 1,
          },
        }),
        module({
          id: "hermes-pc-widget",
          name: "Hermes System",
        }),
        module({
          id: "hermes-volume-widget",
          name: "Hermes Volume",
        }),
      ],
      new Map([
        ["spotify-widget", ready],
        ["spotify-widget-compact", ready],
        ["hermes-pc-widget", ready],
        ["hermes-volume-widget", ready],
      ]),
    );

    expect(families.map((family) => family.id)).toEqual([
      "hermes-pc-widget",
      "hermes-volume-widget",
      "spotify",
    ]);
    expect(families.find((family) => family.id === "spotify")?.variants.map((variant) => variant.label)).toEqual([
      "Compact",
      "Standard",
    ]);
  });

  it("filters families by matching variant metadata and availability status", () => {
    const families = groupMarketplaceFamilies(
      [
        module({
          id: "calendar-agenda-widget",
          name: "Calendar Agenda",
          category: "productivity",
          requiredProviders: ["google"],
          capabilities: ["calendar", "focus"],
          marketplace: {
            familyId: "calendar-agenda",
            familyName: "Calendar Agenda",
            variantLabel: "Standard",
            variantOrder: 1,
          },
        }),
        module({
          id: "calendar-agenda-widget-compact",
          name: "Calendar Agenda Compact",
          category: "productivity",
          size: { width: 1, height: 1 },
          requiredProviders: ["google"],
          capabilities: ["calendar", "focus"],
          marketplace: {
            familyId: "calendar-agenda",
            familyName: "Calendar Agenda",
            variantLabel: "Compact",
            variantOrder: 2,
          },
        }),
      ],
      new Map([
        ["calendar-agenda-widget", needsGoogle],
        ["calendar-agenda-widget-compact", ready],
      ]),
    );

    const filtered = filterMarketplaceFamilies(families, {
      query: "compact",
      categories: ["productivity"],
      providers: ["google"],
      sizes: [{ width: 1, height: 1 }],
      status: "ready",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("calendar-agenda");
    expect(filtered[0].status).toBe("ready");
    expect(filtered[0].variants.map((variant) => variant.meta.id)).toEqual([
      "calendar-agenda-widget-compact",
    ]);
  });
});
