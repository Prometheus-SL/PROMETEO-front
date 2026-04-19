import { z } from "zod";

import type { ModuleMeta } from "../types";
import {
  getFieldDefinition,
  getModuleConfigUiDefinition,
} from "./definitions";
import type {
  ModuleConfigFieldDefinition,
  ModuleConfigOption,
  ModuleConfigValidation,
  ResolvedModuleConfigField,
} from "./types";

export {
  getModuleConfigUiDefinition,
  hasExplicitFieldDefinition,
} from "./definitions";
export type {
  ModuleConfigFieldDefinition,
  ModuleConfigInput,
  ModuleConfigUiDefinition,
  ResolvedModuleConfigField,
  WidgetPreviewMode,
} from "./types";

function isObjectSchema(schema: z.ZodTypeAny): schema is z.ZodObject<z.ZodRawShape> {
  return schema instanceof z.ZodObject;
}

export function unwrapField(field: z.ZodTypeAny): z.ZodTypeAny {
  let current = field;

  for (let index = 0; index < 12; index += 1) {
    const definition = Reflect.get(current, "_def") as
      | {
          innerType?: z.ZodTypeAny;
          schema?: z.ZodTypeAny;
          in?: z.ZodTypeAny;
          out?: z.ZodTypeAny;
        }
      | undefined;

    if (
      current instanceof z.ZodDefault ||
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable
    ) {
      if (!definition?.innerType) break;
      current = definition.innerType;
      continue;
    }

    const ZodCatchCtor = Reflect.get(z, "ZodCatch");
    if (typeof ZodCatchCtor === "function" && current instanceof ZodCatchCtor) {
      if (!definition?.innerType) break;
      current = definition.innerType;
      continue;
    }

    const ZodEffectsCtor = Reflect.get(z, "ZodEffects");
    if (
      typeof ZodEffectsCtor === "function" &&
      current instanceof ZodEffectsCtor
    ) {
      if (!definition?.schema) break;
      current = definition.schema;
      continue;
    }

    const ZodPipeCtor = Reflect.get(z, "ZodPipe");
    if (typeof ZodPipeCtor === "function" && current instanceof ZodPipeCtor) {
      if (!definition?.in) break;
      current = definition.in;
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

  return undefined;
}

function getFallbackValue(base: z.ZodTypeAny): unknown {
  if (base instanceof z.ZodString) return "";
  if (base instanceof z.ZodNumber) return "";
  if (base instanceof z.ZodBoolean) return false;
  if (base instanceof z.ZodEnum) return base.options?.[0] ?? "";
  return undefined;
}

function humanizeKey(key: string) {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!spaced) return key;

  return spaced
    .split(" ")
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === "id") return "ID";
      if (lower === "ip") return "IP";
      if (lower === "api") return "API";
      if (lower === "ms") return "ms";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function enumOptions(base: z.ZodEnum): ModuleConfigOption[] {
  return (base.options as string[]).map((option) => ({
    value: option,
    label: humanizeKey(option),
  }));
}

function getNumberBound(
  base: z.ZodTypeAny,
  key: "minValue" | "maxValue",
): number | undefined {
  const value = Reflect.get(base, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getNumberStep(base: z.ZodTypeAny): number {
  return Reflect.get(base, "isInt") === true ? 1 : 1;
}

function inferInput(
  base: z.ZodTypeAny,
  definition?: ModuleConfigFieldDefinition,
) {
  if (definition?.input) return definition.input;
  if (base instanceof z.ZodBoolean) return "switch";
  if (base instanceof z.ZodEnum) {
    return base.options.length <= 4 ? "segmented" : "select";
  }
  if (base instanceof z.ZodNumber) {
    const min = definition?.min ?? getNumberBound(base, "minValue");
    const max = definition?.max ?? getNumberBound(base, "maxValue");
    return min !== undefined && max !== undefined ? "slider" : "number";
  }
  if (base instanceof z.ZodString) return "text";
  return "json";
}

function isRequired(field: z.ZodTypeAny) {
  return !field.safeParse(undefined).success;
}

function getOrderedShapeEntries(
  shape: Record<string, z.ZodTypeAny>,
  meta: ModuleMeta,
) {
  const definition = getModuleConfigUiDefinition(meta.id);
  const keys = Object.keys(shape);
  const order = definition.order ?? [];
  const ordered = [
    ...order.filter((key) => key in shape),
    ...keys.filter((key) => !order.includes(key)),
  ];

  return ordered.map((key) => [key, shape[key]] as const);
}

export function buildInitialConfig(
  schema: z.ZodTypeAny | null | undefined,
  meta: ModuleMeta,
  initial: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema || !isObjectSchema(schema)) {
    return { ...initial };
  }

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const result: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(shape)) {
    const definition = getFieldDefinition(meta.id, key);
    const base = unwrapField(field);
    const defaultValue =
      definition && "defaultValue" in definition
        ? definition.defaultValue
        : resolveFieldDefault(field);

    result[key] = defaultValue !== undefined ? defaultValue : getFallbackValue(base);
  }

  return {
    ...result,
    ...initial,
  };
}

export function resolveConfigFields({
  schema,
  meta,
  value,
}: {
  schema: z.ZodTypeAny;
  meta: ModuleMeta;
  value: Record<string, unknown>;
}): ResolvedModuleConfigField[] {
  if (!isObjectSchema(schema)) {
    return [];
  }

  const shape = schema.shape as Record<string, z.ZodTypeAny>;

  return getOrderedShapeEntries(shape, meta).map(([key, field]) => {
    const base = unwrapField(field);
    const definition = getFieldDefinition(meta.id, key);
    const options =
      definition?.options ??
      (base instanceof z.ZodEnum ? enumOptions(base) : undefined);
    const input = inferInput(base, definition);
    const min = definition?.min ?? getNumberBound(base, "minValue");
    const max = definition?.max ?? getNumberBound(base, "maxValue");
    const step = definition?.step ?? (base instanceof z.ZodNumber ? getNumberStep(base) : undefined);

    return {
      key,
      schema: field,
      baseSchema: base,
      required: isRequired(field),
      value: value[key],
      label: definition?.label ?? humanizeKey(key),
      helpText: definition?.helpText,
      placeholder: definition?.placeholder,
      section: definition?.section ?? (input === "json" ? "advanced" : "essential"),
      input,
      unit: definition?.unit,
      displayUnit: definition?.displayUnit,
      defaultValue: definition?.defaultValue,
      min,
      max,
      step,
      options,
    };
  });
}

export function validateConfigDraft(
  schema: z.ZodTypeAny | null | undefined,
  value: Record<string, unknown>,
): ModuleConfigValidation {
  if (!schema) {
    return {
      isValid: true,
      parsed: value,
      errorsByKey: {},
    };
  }

  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return {
      isValid: true,
      parsed: parsed.data as Record<string, unknown>,
      errorsByKey: {},
    };
  }

  const errorsByKey: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "_root");
    if (!errorsByKey[key]) {
      errorsByKey[key] = issue.message;
    }
  }

  return {
    isValid: false,
    errorsByKey,
  };
}

export function toDisplayValue(
  field: Pick<ResolvedModuleConfigField, "unit" | "displayUnit">,
  value: unknown,
) {
  if (value === "" || value === undefined || value === null) return "";
  if (
    field.unit === "milliseconds" &&
    field.displayUnit === "seconds" &&
    typeof value === "number"
  ) {
    return value / 1000;
  }

  if (
    field.unit === "milliseconds" &&
    field.displayUnit === "minutes" &&
    typeof value === "number"
  ) {
    return value / 60000;
  }

  return value;
}

export function toConfigValue(
  field: Pick<ResolvedModuleConfigField, "baseSchema" | "unit" | "displayUnit">,
  value: unknown,
) {
  if (field.baseSchema instanceof z.ZodNumber) {
    if (value === "" || value === undefined || value === null) return "";
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return "";

    if (field.unit === "milliseconds" && field.displayUnit === "seconds") {
      return numberValue * 1000;
    }

    if (field.unit === "milliseconds" && field.displayUnit === "minutes") {
      return numberValue * 60000;
    }

    return numberValue;
  }

  if (field.baseSchema instanceof z.ZodBoolean) {
    return Boolean(value);
  }

  return value;
}
