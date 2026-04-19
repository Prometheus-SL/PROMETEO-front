import type {
  ModuleDevSession,
  ModuleDevTheme,
} from "./types";

export const MODULE_DEV_SESSION_STORAGE_KEY = "prometeo-dev-modules-session";

function isTheme(value: unknown): value is ModuleDevTheme {
  return value === "light" || value === "dark" || value === "system";
}

function isRole(value: unknown): value is ModuleDevSession["role"] {
  return value === "user" || value === "admin";
}

function normalizeRole(value: unknown): ModuleDevSession["role"] {
  return isRole(value) ? value : "admin";
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => {
      return typeof entry[0] === "string" && typeof entry[1] === "string";
    }),
  );
}

export function createDefaultModuleDevSession(
  selectedEntryId: string | null = null,
): ModuleDevSession {
  return {
    selectedEntryId,
    presetId: null,
    theme: "system",
    role: "admin",
    persist: true,
    configTextByEntry: {},
    sharedTextByEntry: {},
    mockTextByEntry: {},
    actionsTextByEntry: {},
  };
}

export function restoreModuleDevSession(
  raw: string | null | undefined,
  selectedEntryId: string | null = null,
): ModuleDevSession {
  const defaults = createDefaultModuleDevSession(selectedEntryId);

  if (!raw) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      selectedEntryId:
        typeof parsed.selectedEntryId === "string"
          ? parsed.selectedEntryId
          : defaults.selectedEntryId,
      presetId: typeof parsed.presetId === "string" ? parsed.presetId : null,
      theme: isTheme(parsed.theme) ? parsed.theme : defaults.theme,
      role: normalizeRole(parsed.role),
      persist:
        typeof parsed.persist === "boolean" ? parsed.persist : defaults.persist,
      configTextByEntry: asStringRecord(parsed.configTextByEntry),
      sharedTextByEntry: asStringRecord(parsed.sharedTextByEntry),
      mockTextByEntry: asStringRecord(parsed.mockTextByEntry),
      actionsTextByEntry: asStringRecord(parsed.actionsTextByEntry),
    };
  } catch {
    return defaults;
  }
}

export function serializeModuleDevSession(session: ModuleDevSession) {
  return JSON.stringify(session);
}
