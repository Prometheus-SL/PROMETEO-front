import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ModulesIndexEntry } from "../src/modules/types";

const loaderMocks = vi.hoisted(() => ({
  loadModulesIndex: vi.fn<() => Promise<ModulesIndexEntry[]>>(),
  loadModuleConfigSchema: vi.fn(),
  loadModuleDefinition: vi.fn(),
}));

vi.mock("@/modules/loader", () => ({
  loadModulesIndex: loaderMocks.loadModulesIndex,
  loadModuleConfigSchema: loaderMocks.loadModuleConfigSchema,
  loadModuleDefinition: loaderMocks.loadModuleDefinition,
}));

describe("dev modules catalog loading", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("builds automatic presets from config schemas without importing module components", async () => {
    loaderMocks.loadModulesIndex.mockResolvedValue([
      {
        basePath: "/modules/weather-widget",
        meta: {
          id: "weather-widget",
          name: "Weather",
          entry: "./index.tsx",
          size: { width: 2, height: 2 },
        },
        importers: {
          entry: async () => ({
            default: () => null,
          }),
          config: async () => ({
            schema: z.object({
              city: z.string().default("Madrid"),
            }),
          }),
        },
      },
    ]);
    loaderMocks.loadModuleConfigSchema.mockResolvedValue(
      z.object({
        city: z.string().default("Madrid"),
      }),
    );
    loaderMocks.loadModuleDefinition.mockImplementation(async () => {
      throw new Error("catalog should not import module components");
    });

    const { loadModuleDevCatalog } = await import("../src/dev/modules/catalog");
    const catalog = await loadModuleDevCatalog();

    expect(catalog[0]?.defaultPreset.config).toEqual({
      city: "Madrid",
    });
    expect(loaderMocks.loadModuleDefinition).not.toHaveBeenCalled();
    expect(loaderMocks.loadModuleConfigSchema).toHaveBeenCalledTimes(1);
  });

  it("rejects provider-backed entries that expose neither local nor shared mocks", async () => {
    loaderMocks.loadModulesIndex.mockResolvedValue([
      {
        basePath: "/modules/notion-widget",
        meta: {
          id: "notion-widget",
          name: "Notion",
          entry: "./index.tsx",
          size: { width: 2, height: 2 },
          requiredProviders: ["notion"],
        },
        importers: {
          entry: async () => ({
            default: () => null,
          }),
          config: async () => ({
            schema: z.object({
              title: z.string().default("Notion"),
            }),
          }),
        },
      },
    ]);
    loaderMocks.loadModuleConfigSchema.mockResolvedValue(
      z.object({
        title: z.string().default("Notion"),
      }),
    );

    const { loadModuleDevCatalog } = await import("../src/dev/modules/catalog");

    await expect(loadModuleDevCatalog()).rejects.toThrow(
      /notion-widget|allowLiveRequests|mock/i,
    );
  });
});
