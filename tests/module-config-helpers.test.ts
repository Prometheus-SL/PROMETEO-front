import { describe, expect, it } from "vitest";
import { z } from "zod";

import discordSchema from "../modules/discord-widget/config";
import hermesSchema from "../modules/hermes-widget/config";
import sparkSchema from "../modules/spark-widget/config";
import weatherSchema from "../modules/weather-widget/config";
import whatsappSchema from "../modules/whatsapp-personal-widget/config";
import { loadModuleConfigSchema, loadModulesIndex } from "../src/modules/loader";
import type { ModuleMeta } from "../src/modules/types";
import {
  buildInitialConfig,
  getModuleConfigUiDefinition,
  hasExplicitFieldDefinition,
  resolveConfigFields,
  toConfigValue,
  toDisplayValue,
  validateConfigDraft,
} from "../src/modules/config/schema";
import { resolveWidgetPreviewCanvasSize } from "../src/modules/config/preview-size";

function meta(id: string, name = id): ModuleMeta {
  return {
    id,
    name,
    entry: "./index.tsx",
    size: { width: 2, height: 2 },
  };
}

describe("module config helpers", () => {
  it("builds weather defaults as a valid config without user secrets", () => {
    const initial = buildInitialConfig(weatherSchema, meta("weather-widget"), {});

    expect(initial).toMatchObject({
      city: "Madrid",
      units: "metric",
      language: "es",
    });

    const validation = validateConfigDraft(weatherSchema, initial);

    expect(validation.isValid).toBe(true);
    expect(validation.errorsByKey).toEqual({});
  });

  it("does not treat invalid empty defaults as a valid configured value", () => {
    const initial = buildInitialConfig(discordSchema, meta("discord-widget"), {});

    expect(initial.serverId).toBe("");
    expect(validateConfigDraft(discordSchema, initial).isValid).toBe(false);
  });

  it("converts millisecond fields to friendly seconds while preserving saved units", () => {
    const fields = resolveConfigFields({
      schema: z.object({
        pollMs: z.number().min(5000).default(60000),
        refreshFallbackMs: z.number().min(5000).default(15000),
      }),
      meta: meta("calendar-agenda-widget"),
      value: {},
    });

    const pollMs = fields.find((field) => field.key === "pollMs");
    const fallbackMs = fields.find((field) => field.key === "refreshFallbackMs");

    expect(pollMs?.unit).toBe("milliseconds");
    expect(pollMs?.displayUnit).toBe("seconds");
    expect(toDisplayValue(pollMs!, 60000)).toBe(60);
    expect(toConfigValue(pollMs!, "45")).toBe(45000);

    expect(fallbackMs?.unit).toBe("milliseconds");
    expect(fallbackMs?.displayUnit).toBe("seconds");
    expect(toDisplayValue(fallbackMs!, 15000)).toBe(15);
    expect(toConfigValue(fallbackMs!, 30)).toBe(30000);
  });

  it("maps common fields to the expected control types", () => {
    const weatherFields = resolveConfigFields({
      schema: weatherSchema,
      meta: meta("weather-widget"),
      value: {},
    });
    const sparkFields = resolveConfigFields({
      schema: sparkSchema,
      meta: meta("spark-widget"),
      value: {},
    });

    expect(weatherFields.find((field) => field.key === "city")?.input).toBe(
      "text",
    );
    expect(sparkFields.find((field) => field.key === "color")?.input).toBe(
      "color",
    );
    expect(sparkFields.find((field) => field.key === "mood")?.input).toBe(
      "segmented",
    );
    expect(sparkFields.find((field) => field.key === "autoMood")?.input).toBe(
      "switch",
    );
  });

  it("uses dynamic option pickers for provider-owned identifiers", () => {
    const discordFields = resolveConfigFields({
      schema: discordSchema,
      meta: meta("discord-widget"),
      value: {},
    });
    const hermesFields = resolveConfigFields({
      schema: hermesSchema,
      meta: meta("hermes-pc-widget"),
      value: {},
    });

    expect(discordFields.find((field) => field.key === "serverId")).toMatchObject({
      input: "async-select",
      dynamicOptions: { source: "discord.guilds" },
    });
    expect(hermesFields.find((field) => field.key === "agentId")).toMatchObject({
      input: "async-select",
      dynamicOptions: { source: "hermes.agents" },
    });
  });

  it("uses the dashboard widget grid dimensions for preview canvases", () => {
    expect(resolveWidgetPreviewCanvasSize({ width: 2, height: 1 })).toEqual({
      width: 492,
      height: 98.879,
    });
    expect(resolveWidgetPreviewCanvasSize({ width: 1, height: 3 })).toEqual({
      width: 246,
      height: 296.637,
    });
  });

  it("aligns known runtime/schema mismatches with explicit config policy", () => {
    const whatsappInitial = buildInitialConfig(
      whatsappSchema,
      meta("whatsapp-personal-widget"),
      {},
    );
    const hermesSystemInitial = buildInitialConfig(
      hermesSchema,
      meta("hermes-pc-widget"),
      {},
    );
    const hermesVolumeInitial = buildInitialConfig(
      hermesSchema,
      meta("hermes-volume-widget"),
      {},
    );
    const sparkFields = resolveConfigFields({
      schema: sparkSchema,
      meta: meta("spark-widget"),
      value: {},
    });

    expect(whatsappInitial.refreshSeconds).toBe(60);
    expect(hermesSystemInitial).toMatchObject({
      title: "Hermes System",
      refreshFallbackMs: 30000,
    });
    expect(hermesVolumeInitial).toMatchObject({
      title: "Hermes Volume",
      refreshFallbackMs: 15000,
    });
    expect(sparkFields.find((field) => field.key === "pooEnabled")?.section).toBe(
      "advanced",
    );
    expect(sparkFields.find((field) => field.key === "inactivityMs")?.section).toBe(
      "advanced",
    );
  });

  it("has explicit UI metadata for every current module schema field", async () => {
    const entries = await loadModulesIndex();

    for (const entry of entries) {
      const schema = await loadModuleConfigSchema(entry);
      if (!(schema instanceof z.ZodObject)) continue;

      const fields = resolveConfigFields({
        schema,
        meta: entry.meta,
        value: {},
      });
      const fieldKeys = new Set(fields.map((field) => field.key));
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      const definition = getModuleConfigUiDefinition(entry.meta.id);

      for (const key of Object.keys(shape)) {
        expect(fieldKeys.has(key), `${entry.meta.id}.${key}`).toBe(true);
        expect(
          hasExplicitFieldDefinition(entry.meta.id, key),
          `${entry.meta.id}.${key} missing explicit metadata in ${definition.id}`,
        ).toBe(true);
      }
    }
  });
});
