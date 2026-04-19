import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  defineModuleDev,
  getDefaultPreset,
  getPreset,
  listPresetOptions,
  resolveConfigDefaults,
  resolveModuleCanvasSize,
} from "../src/dev/modules/helpers";

describe("dev modules helpers", () => {
  const definition = defineModuleDev({
    presets: [
      {
        entryId: "spotify-widget",
        id: "playback",
        name: "Playback",
      },
      {
        entryId: "spotify-widget",
        id: "unconfigured",
        name: "Unconfigured",
      },
      {
        entryId: "spotify-widget-compact",
        id: "compact",
        name: "Compact",
      },
    ],
  });

  it("returns the first preset for an entry as its default preset", () => {
    expect(getDefaultPreset(definition, "spotify-widget")).toMatchObject({
      entryId: "spotify-widget",
      id: "playback",
      name: "Playback",
    });
  });

  it("finds a specific preset by entry id and preset id", () => {
    expect(getPreset(definition, "spotify-widget", "unconfigured")).toMatchObject(
      {
        id: "unconfigured",
        name: "Unconfigured",
      },
    );
  });

  it("lists preset options in entry and declaration order", () => {
    expect(listPresetOptions(definition)).toEqual([
      {
        entryId: "spotify-widget",
        presetId: "playback",
        label: "Playback",
      },
      {
        entryId: "spotify-widget",
        presetId: "unconfigured",
        label: "Unconfigured",
      },
      {
        entryId: "spotify-widget-compact",
        presetId: "compact",
        label: "Compact",
      },
    ]);
  });

  it("throws a clear error when a requested preset is missing", () => {
    expect(() => getPreset(definition, "spotify-widget", "missing")).toThrow(
      /dev preset "missing" for entry "spotify-widget"/i,
    );
  });

  it("converts module size metadata into a stable canvas size", () => {
    expect(resolveModuleCanvasSize({ width: 2, height: 3 })).toEqual({
      width: 492,
      height: 296.637,
    });
  });

  it("derives default config values from zod schemas", () => {
    const schema = z.object({
      title: z.string().default("Quick Actions"),
      maxActions: z.number().default(4),
      showWidgetIds: z.boolean().default(false),
      mode: z.enum(["auto", "agent"]).default("auto"),
    });

    expect(resolveConfigDefaults(schema)).toEqual({
      title: "Quick Actions",
      maxActions: 4,
      showWidgetIds: false,
      mode: "auto",
    });
  });

  it("does not invent placeholder values for required fields without defaults", () => {
    const schema = z.object({
      city: z.string().default("Madrid"),
      apiKey: z.string().min(1),
      units: z.enum(["metric", "imperial"]).default("metric"),
    });

    expect(resolveConfigDefaults(schema)).toEqual({
      city: "Madrid",
      units: "metric",
    });
  });
});
