import { z } from "zod";

import type { ModuleAudience, ModuleRole, ModuleSize } from "@/modules/types";
import type { AuthUser } from "@/services/auth";

export type ModuleDevSurface = Exclude<ModuleAudience, "all">;
export type ModuleDevTheme = "light" | "dark" | "system";
export type ModuleDevCanvasMode = "fit" | "actual";

export type ModuleDevAuthState = {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: Partial<AuthUser> | null;
  role?: ModuleRole;
  loading?: boolean;
  error?: string | null;
};

export type ModuleDevPreset = {
  entryId: string;
  id: string;
  name: string;
  config?: Record<string, unknown>;
  auto?: boolean;
};

export type ModuleDevDefinition = {
  presets: ModuleDevPreset[];
};

export type ModuleDevOption = {
  entryId: string;
  presetId: string;
  label: string;
};

export type ModuleDevMockAdapter<TState = Record<string, unknown>> = {
  stateSchema?: z.ZodType<TState>;
  createInitialState?: () => TState;
  apply: (state: TState) => void | Promise<void>;
  cleanup?: () => void | Promise<void>;
};

export type ModuleDevActionDraft = {
  id: string;
  title: string;
  widgetId: string;
  description?: string;
  intentTags?: string[];
  requiresConfirmation?: boolean;
  message?: string;
};

export type ModuleDevSession = {
  selectedEntryId: string | null;
  presetId: string | null;
  surface: ModuleDevSurface;
  theme: ModuleDevTheme;
  role: ModuleRole;
  canvasMode: ModuleDevCanvasMode;
  persist: boolean;
  configTextByEntry: Record<string, string>;
  sharedTextByEntry: Record<string, string>;
  mockTextByEntry: Record<string, string>;
  actionsTextByEntry: Record<string, string>;
};

export type ModuleCanvasSize = {
  width: number;
  height: number;
};

export type ModuleSizeLike = ModuleSize | null | undefined;
