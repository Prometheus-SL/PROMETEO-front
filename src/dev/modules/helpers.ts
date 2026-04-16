import { z } from "zod";

import type {
  ModuleCanvasSize,
  ModuleDevDefinition,
  ModuleDevPreset,
  ModuleDevOption,
  ModuleSizeLike,
} from "./types";

const GRID_CELL_WIDTH = 246;
const GRID_CELL_HEIGHT = 98.879;

export type {
  ModuleCanvasSize,
  ModuleDevDefinition,
  ModuleDevPreset,
  ModuleDevOption,
  ModuleSizeLike,
} from "./types";

export function defineModuleDev(
  definition: ModuleDevDefinition,
): ModuleDevDefinition {
  return definition;
}

export function getPresetsForEntry(
  definition: ModuleDevDefinition,
  entryId: string,
): ModuleDevPreset[] {
  return definition.presets.filter((preset) => preset.entryId === entryId);
}

export function getDefaultPreset(
  definition: ModuleDevDefinition,
  entryId: string,
): ModuleDevPreset {
  const preset = getPresetsForEntry(definition, entryId)[0];
  if (!preset) {
    throw new Error(`Missing dev presets for entry "${entryId}".`);
  }

  return preset;
}

export function getPreset(
  definition: ModuleDevDefinition,
  entryId: string,
  presetId: string,
): ModuleDevPreset {
  const preset = definition.presets.find(
    (candidate) =>
      candidate.entryId === entryId && candidate.id === presetId,
  );

  if (!preset) {
    throw new Error(`Missing dev preset "${presetId}" for entry "${entryId}".`);
  }

  return preset;
}

export function listPresetOptions(
  definition: ModuleDevDefinition,
): ModuleDevOption[] {
  return definition.presets.map((preset) => ({
    entryId: preset.entryId,
    presetId: preset.id,
    label: preset.name,
  }));
}

function unwrapField(field: z.ZodTypeAny): z.ZodTypeAny {
  let current = field;

  for (let index = 0; index < 10; index += 1) {
    const ZodCatchCtor = Reflect.get(z, "ZodCatch");
    const ZodEffectsCtor = Reflect.get(z, "ZodEffects");

    if (
      current instanceof z.ZodDefault ||
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable ||
      (typeof ZodCatchCtor === "function" && current instanceof ZodCatchCtor)
    ) {
      const definition = Reflect.get(current, "_def") as unknown as
        | { innerType?: z.ZodTypeAny }
        | undefined;
      if (!definition?.innerType) {
        break;
      }
      current = definition.innerType;
      continue;
    }

    if (typeof ZodEffectsCtor === "function" && current instanceof ZodEffectsCtor) {
      const definition = Reflect.get(current, "_def") as unknown as
        | { schema?: z.ZodTypeAny }
        | undefined;
      if (!definition?.schema) {
        break;
      }
      current = definition.schema;
      continue;
    }

    break;
  }

  return current;
}

function resolveFieldDefault(field: z.ZodTypeAny): unknown {
  const parsed = field.safeParse(undefined);
  if (parsed.success && parsed.data !== undefined) {
    return parsed.data;
  }

  const base = unwrapField(field);

  if (base instanceof z.ZodString) {
    return "";
  }

  if (base instanceof z.ZodNumber) {
    return 0;
  }

  if (base instanceof z.ZodBoolean) {
    return false;
  }

  if (base instanceof z.ZodEnum) {
    return base.options[0] ?? "";
  }

  if (base instanceof z.ZodArray) {
    return [];
  }

  if (base instanceof z.ZodObject) {
    return resolveConfigDefaults(base);
  }

  return undefined;
}

export function resolveConfigDefaults(schema?: unknown): Record<string, unknown> {
  if (!(schema instanceof z.ZodObject)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  const shape = schema.shape as Record<string, z.ZodTypeAny>;

  for (const [key, field] of Object.entries(shape)) {
    const value = resolveFieldDefault(field);
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

export function resolveModuleCanvasSize(size?: ModuleSizeLike): ModuleCanvasSize {
  const width = Math.max(1, Math.round(size?.width ?? 2));
  const height = Math.max(1, Math.round(size?.height ?? 2));

  return {
    width: Number((width * GRID_CELL_WIDTH).toFixed(3)),
    height: Number((height * GRID_CELL_HEIGHT).toFixed(3)),
  };
}
