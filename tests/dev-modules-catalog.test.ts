import { describe, expect, it } from "vitest";

import { loadModulesIndex } from "../src/modules/loader";
import { loadModuleDevCatalog } from "../src/dev/modules/catalog";

describe("dev modules catalog", () => {
  it("covers every module entry discovered by the loader", async () => {
    const modules = await loadModulesIndex();
    const catalog = await loadModuleDevCatalog();

    expect(catalog).toHaveLength(modules.length);
    expect(new Set(catalog.map((item) => item.entry.meta.id))).toEqual(
      new Set(modules.map((entry) => entry.meta.id)),
    );
  });

  it("reuses explicit presets when a module declares dev.ts", async () => {
    const catalog = await loadModuleDevCatalog();
    const spotify = catalog.find((item) => item.entry.meta.id === "spotify-widget");

    expect(spotify).toBeDefined();
    expect(spotify?.presets.some((preset) => preset.id === "playback")).toBe(
      true,
    );
    expect(spotify?.defaultPreset.auto ?? false).toBe(false);
  });

  it("creates an automatic fallback preset for entries without dev.ts", async () => {
    const catalog = await loadModuleDevCatalog();
    const weather = catalog.find((item) => item.entry.meta.id === "weather-widget");

    expect(weather).toBeDefined();
    expect(weather?.defaultPreset.id).toBe("auto");
    expect(weather?.defaultPreset.auto).toBe(true);
    expect(weather?.defaultPreset.config).toEqual(
      expect.objectContaining({
        city: expect.any(String),
      }),
    );
  });

  it("detects when an entry has a local mock adapter", async () => {
    const catalog = await loadModuleDevCatalog();
    const spotify = catalog.find((item) => item.entry.meta.id === "spotify-widget");
    const weather = catalog.find((item) => item.entry.meta.id === "weather-widget");

    expect(spotify?.hasMockAdapter).toBe(true);
    expect(weather?.hasMockAdapter).toBe(false);
  });
});
