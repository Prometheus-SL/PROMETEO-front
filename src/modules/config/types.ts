import type { z } from "zod";

export type ModuleConfigSection = "essential" | "advanced";

export type ModuleConfigInput =
  | "text"
  | "secret"
  | "number"
  | "slider"
  | "switch"
  | "select"
  | "segmented"
  | "color"
  | "json";

export type ModuleConfigUnit =
  | "milliseconds"
  | "seconds"
  | "items"
  | "count"
  | "percent"
  | "text";

export type ModuleConfigDisplayUnit = "milliseconds" | "seconds" | "minutes";

export type WidgetPreviewMode = "sample" | "live";

export type ModuleConfigOption = {
  value: string;
  label: string;
};

export type ModuleConfigFieldDefinition = {
  label: string;
  helpText?: string;
  placeholder?: string;
  section?: ModuleConfigSection;
  input?: ModuleConfigInput;
  unit?: ModuleConfigUnit;
  displayUnit?: ModuleConfigDisplayUnit;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: ModuleConfigOption[];
};

export type ModuleConfigUiDefinition = {
  id: string;
  fields: Record<string, ModuleConfigFieldDefinition>;
  order?: string[];
  sampleConfig?: Record<string, unknown>;
};

export type ResolvedModuleConfigField = Required<
  Pick<ModuleConfigFieldDefinition, "label" | "section" | "input">
> &
  Omit<ModuleConfigFieldDefinition, "label" | "section" | "input"> & {
    key: string;
    baseSchema: z.ZodTypeAny;
    schema: z.ZodTypeAny;
    required: boolean;
    value: unknown;
    options?: ModuleConfigOption[];
  };

export type ModuleConfigValidation = {
  isValid: boolean;
  parsed?: Record<string, unknown>;
  errorsByKey: Record<string, string>;
};
