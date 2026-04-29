const LOCK_SCREEN_BACKGROUND_MODES = [
  "media-artwork",
  "nasa-apod",
  "single-image",
  "playlist",
  "solid-color",
  "gradient",
] as const;

const LOCK_SCREEN_CLOCK_STYLES = [
  "glass",
  "minimal",
  "poster",
  "terminal",
  "capsule",
] as const;
const LOCK_SCREEN_CLOCK_POSITIONS = [
  "center",
  "center-left",
  "center-right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;
export const LOCK_SCREEN_WIDGET_IDS = [
  "now-playing",
  "weather",
] as const;
const LOCK_SCREEN_WEATHER_UNITS = ["metric", "imperial"] as const;
const LOCK_SCREEN_WEATHER_LANGUAGES = ["es", "en", "fr", "de"] as const;
const LOCK_SCREEN_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type LockScreenBackgroundMode =
  (typeof LOCK_SCREEN_BACKGROUND_MODES)[number];
export type LockScreenClockStyle = (typeof LOCK_SCREEN_CLOCK_STYLES)[number];
export type LockScreenClockPosition =
  (typeof LOCK_SCREEN_CLOCK_POSITIONS)[number];
export type LockScreenWidgetId = (typeof LOCK_SCREEN_WIDGET_IDS)[number];
export type LockScreenWeatherUnits =
  (typeof LOCK_SCREEN_WEATHER_UNITS)[number];
export type LockScreenWeatherLanguage =
  (typeof LOCK_SCREEN_WEATHER_LANGUAGES)[number];
export type LockScreenWeekDay = (typeof LOCK_SCREEN_WEEK_DAYS)[number];
export type LockScreenSleepSchedule = {
  enabled: boolean;
  startTime: string;
  endTime: string;
  days: LockScreenWeekDay[];
};

export type LockScreenConfig = {
  backgroundMode: LockScreenBackgroundMode;
  imageUrl: string;
  playlist: string[];
  playlistIntervalSeconds: number;
  solidColor: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  overlayOpacity: number;
  blurPx: number;
  clockStyle: LockScreenClockStyle;
  clockPosition: LockScreenClockPosition;
  showSeconds: boolean;
  use24Hour: boolean;
  showDate: boolean;
  clockScale: number;
  accentColor: string;
  enabledWidgets: LockScreenWidgetId[];
  weatherCity: string;
  weatherUnits: LockScreenWeatherUnits;
  weatherLanguage: LockScreenWeatherLanguage;
  sleepSchedule: LockScreenSleepSchedule;
};

export const DEFAULT_LOCK_SCREEN_CONFIG: LockScreenConfig = {
  backgroundMode: "media-artwork",
  imageUrl: "",
  playlist: [],
  playlistIntervalSeconds: 45,
  solidColor: "#050505",
  gradientFrom: "#050505",
  gradientTo: "#202020",
  gradientAngle: 145,
  overlayOpacity: 55,
  blurPx: 8,
  clockStyle: "glass",
  clockPosition: "center",
  showSeconds: true,
  use24Hour: true,
  showDate: true,
  clockScale: 100,
  accentColor: "#f8fafc",
  enabledWidgets: [],
  weatherCity: "Madrid",
  weatherUnits: "metric",
  weatherLanguage: "es",
  sleepSchedule: {
    enabled: false,
    startTime: "23:00",
    endTime: "07:00",
    days: [...LOCK_SCREEN_WEEK_DAYS],
  },
};

export const CLIENT_LOCK_SCREEN_STYLE_STORAGE_KEY =
  "prometeo.client.lockScreen.style";
export const CLIENT_LOCK_SCREEN_STYLE_EVENT =
  "prometeo:client-lock-screen-style";
export const GLOBAL_LOCK_SCREEN_CONFIG_STORAGE_KEY =
  "prometeo.lockScreen.config";
export const GLOBAL_LOCK_SCREEN_CONFIG_EVENT = "prometeo:lock-screen-config";

export function normalizeLockScreenConfig(input: unknown): LockScreenConfig {
  const source = asRecord(input);
  const backgroundMode = asOneOf(
    source.backgroundMode,
    LOCK_SCREEN_BACKGROUND_MODES,
    DEFAULT_LOCK_SCREEN_CONFIG.backgroundMode,
  );
  const imageUrl = isSafeExternalUrl(source.imageUrl)
    ? String(source.imageUrl).trim()
    : "";
  const playlist = parseLockScreenPlaylist(source.playlist);
  const playlistIntervalSeconds = clampNumber(
    source.playlistIntervalSeconds,
    15,
    900,
    DEFAULT_LOCK_SCREEN_CONFIG.playlistIntervalSeconds,
  );
  const solidColor = normalizeHexColor(
    source.solidColor,
    DEFAULT_LOCK_SCREEN_CONFIG.solidColor,
  );
  const gradientFrom = normalizeHexColor(
    source.gradientFrom,
    DEFAULT_LOCK_SCREEN_CONFIG.gradientFrom,
  );
  const gradientTo = normalizeHexColor(
    source.gradientTo,
    DEFAULT_LOCK_SCREEN_CONFIG.gradientTo,
  );
  const gradientAngle = clampNumber(
    source.gradientAngle,
    0,
    360,
    DEFAULT_LOCK_SCREEN_CONFIG.gradientAngle,
  );
  const overlayOpacity = clampNumber(
    source.overlayOpacity,
    0,
    90,
    DEFAULT_LOCK_SCREEN_CONFIG.overlayOpacity,
  );
  const blurPx = clampNumber(
    source.blurPx,
    0,
    24,
    DEFAULT_LOCK_SCREEN_CONFIG.blurPx,
  );
  const clockStyle = asOneOf(
    source.clockStyle,
    LOCK_SCREEN_CLOCK_STYLES,
    DEFAULT_LOCK_SCREEN_CONFIG.clockStyle,
  );
  const clockPosition = asOneOf(
    source.clockPosition,
    LOCK_SCREEN_CLOCK_POSITIONS,
    DEFAULT_LOCK_SCREEN_CONFIG.clockPosition,
  );
  const accentColor = normalizeHexColor(
    source.accentColor,
    DEFAULT_LOCK_SCREEN_CONFIG.accentColor,
  );
  const clockScale = clampNumber(
    source.clockScale,
    80,
    140,
    DEFAULT_LOCK_SCREEN_CONFIG.clockScale,
  );
  const enabledWidgets = normalizeLockScreenWidgets(source.enabledWidgets);
  const weatherCity = normalizeText(
    source.weatherCity,
    DEFAULT_LOCK_SCREEN_CONFIG.weatherCity,
    72,
  );
  const weatherUnits = asOneOf(
    source.weatherUnits,
    LOCK_SCREEN_WEATHER_UNITS,
    DEFAULT_LOCK_SCREEN_CONFIG.weatherUnits,
  );
  const weatherLanguage = asOneOf(
    source.weatherLanguage,
    LOCK_SCREEN_WEATHER_LANGUAGES,
    DEFAULT_LOCK_SCREEN_CONFIG.weatherLanguage,
  );
  const sleepSchedule = normalizeLockScreenSleepSchedule(source.sleepSchedule);

  return {
    backgroundMode,
    imageUrl,
    playlist,
    playlistIntervalSeconds,
    solidColor,
    gradientFrom,
    gradientTo,
    gradientAngle,
    overlayOpacity,
    blurPx,
    clockStyle,
    clockPosition,
    showSeconds:
      typeof source.showSeconds === "boolean"
        ? source.showSeconds
        : DEFAULT_LOCK_SCREEN_CONFIG.showSeconds,
    use24Hour:
      typeof source.use24Hour === "boolean"
        ? source.use24Hour
        : DEFAULT_LOCK_SCREEN_CONFIG.use24Hour,
    showDate:
      typeof source.showDate === "boolean"
        ? source.showDate
        : DEFAULT_LOCK_SCREEN_CONFIG.showDate,
    clockScale,
    accentColor,
    enabledWidgets,
    weatherCity,
    weatherUnits,
    weatherLanguage,
    sleepSchedule,
  };
}

export function readLockScreenConfig(
  style?: Record<string, unknown> | null,
): LockScreenConfig {
  const source = asRecord(style);
  return normalizeLockScreenConfig(source.lockScreen);
}

export function hasLockScreenConfig(
  style?: Record<string, unknown> | null,
): boolean {
  const source = asRecord(style);
  return Boolean(
    source.lockScreen &&
      typeof source.lockScreen === "object" &&
      !Array.isArray(source.lockScreen),
  );
}

export function writeLockScreenConfig(
  style: Record<string, unknown> | null | undefined,
  config: LockScreenConfig,
): Record<string, unknown> {
  return {
    ...(asRecord(style) as Record<string, unknown>),
    lockScreen: normalizeLockScreenConfig(config),
  };
}

export function persistGlobalLockScreenConfig(config: LockScreenConfig) {
  if (typeof window === "undefined") return;

  const normalized = normalizeLockScreenConfig(config);
  window.localStorage.setItem(
    GLOBAL_LOCK_SCREEN_CONFIG_STORAGE_KEY,
    JSON.stringify(normalized),
  );

  // Keep legacy session snapshot in sync for existing client runtime listeners.
  persistClientLockScreenStyle({ lockScreen: normalized });
  window.dispatchEvent(
    new CustomEvent(GLOBAL_LOCK_SCREEN_CONFIG_EVENT, {
      detail: normalized,
    }),
  );
}

export function readPersistedGlobalLockScreenConfig(): LockScreenConfig {
  if (typeof window === "undefined") {
    return normalizeLockScreenConfig(undefined);
  }

  const raw = window.localStorage.getItem(GLOBAL_LOCK_SCREEN_CONFIG_STORAGE_KEY);
  if (raw) {
    try {
      return normalizeLockScreenConfig(JSON.parse(raw));
    } catch {
      // Fall through to legacy key/default.
    }
  }

  const legacyStyle = readPersistedClientLockScreenStyle();
  if (legacyStyle) {
    return readLockScreenConfig(legacyStyle);
  }

  return normalizeLockScreenConfig(undefined);
}

export function parseLockScreenPlaylist(
  input: string | string[] | unknown,
): string[] {
  const rawItems = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/\r?\n/g)
      : [];

  return rawItems
    .map((item) => String(item || "").trim())
    .filter((item) => isSafeExternalUrl(item));
}

export function resolvePlaylistImageUrl(
  playlist: string[],
  nowMs: number,
  intervalSeconds: number,
): string | null {
  if (!playlist.length) return null;
  const safeInterval = Math.max(15, Math.floor(intervalSeconds || 0));
  const bucket = Math.floor(Math.max(0, nowMs) / (safeInterval * 1000));
  return playlist[bucket % playlist.length] ?? playlist[0] ?? null;
}

export function resolveNasaApodImageUrl(payload: unknown): string | null {
  const source = asRecord(payload);
  if (String(source.media_type || "").trim().toLowerCase() !== "image") {
    return null;
  }

  if (isSafeExternalUrl(source.hdurl)) {
    return String(source.hdurl).trim();
  }

  if (isSafeExternalUrl(source.url)) {
    return String(source.url).trim();
  }

  return null;
}

export function resolveLockScreenCanvasBackground(
  config: Pick<
    LockScreenConfig,
    "backgroundMode" | "solidColor" | "gradientFrom" | "gradientTo" | "gradientAngle"
  >,
): string | null {
  if (config.backgroundMode === "solid-color") {
    return config.solidColor;
  }

  if (config.backgroundMode === "gradient") {
    return `linear-gradient(${config.gradientAngle}deg, ${config.gradientFrom} 0%, ${config.gradientTo} 100%)`;
  }

  return null;
}

export function buildLockScreenOverlayBackground(overlayOpacity: number) {
  const startAlpha = roundAlpha(clamp(overlayOpacity / 100 + 0.14, 0, 0.95));
  const endAlpha = roundAlpha(clamp(overlayOpacity / 100 + 0.28, 0, 0.98));
  return `linear-gradient(180deg, rgba(0, 0, 0, ${startAlpha}), rgba(0, 0, 0, ${endAlpha}))`;
}

export function isLockScreenSleepScheduleActive(
  schedule: LockScreenSleepSchedule,
  now = new Date(),
): boolean {
  const normalized = normalizeLockScreenSleepSchedule(schedule);

  if (!normalized.enabled || normalized.days.length === 0) {
    return false;
  }

  const startMinutes = parseTimeToMinutes(normalized.startTime);
  const endMinutes = parseTimeToMinutes(normalized.endTime);

  if (startMinutes === endMinutes) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay() as LockScreenWeekDay;

  if (startMinutes < endMinutes) {
    return (
      normalized.days.includes(currentDay) &&
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    );
  }

  if (currentMinutes >= startMinutes) {
    return normalized.days.includes(currentDay);
  }

  if (currentMinutes < endMinutes) {
    const previousDay = ((currentDay + 6) % 7) as LockScreenWeekDay;
    return normalized.days.includes(previousDay);
  }

  return false;
}

export function persistClientLockScreenStyle(
  style?: Record<string, unknown> | null,
) {
  if (typeof window === "undefined") return;
  const nextStyle = asRecord(style);
  window.sessionStorage.setItem(
    CLIENT_LOCK_SCREEN_STYLE_STORAGE_KEY,
    JSON.stringify(nextStyle),
  );
  window.dispatchEvent(
    new CustomEvent(CLIENT_LOCK_SCREEN_STYLE_EVENT, {
      detail: nextStyle,
    }),
  );
}

export function readPersistedClientLockScreenStyle():
  | Record<string, unknown>
  | undefined {
  if (typeof window === "undefined") return undefined;

  const raw = window.sessionStorage.getItem(CLIENT_LOCK_SCREEN_STYLE_STORAGE_KEY);
  if (!raw) return undefined;

  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

function asOneOf<T extends readonly string[]>(
  value: unknown,
  supported: T,
  fallback: T[number],
): T[number] {
  const candidate = String(value || "").trim();
  return supported.includes(candidate as T[number])
    ? (candidate as T[number])
    : fallback;
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeLockScreenWidgets(input: unknown): LockScreenWidgetId[] {
  const candidates = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? LOCK_SCREEN_WIDGET_IDS.filter(
          (widgetId) => (input as Record<string, unknown>)[widgetId] === true,
        )
      : DEFAULT_LOCK_SCREEN_CONFIG.enabledWidgets;
  const seen = new Set<LockScreenWidgetId>();

  for (const value of candidates) {
    const widgetId = String(value || "").trim() as LockScreenWidgetId;
    if (
      LOCK_SCREEN_WIDGET_IDS.includes(widgetId) &&
      !seen.has(widgetId)
    ) {
      seen.add(widgetId);
    }
  }

  return Array.from(seen);
}

function normalizeLockScreenSleepSchedule(input: unknown): LockScreenSleepSchedule {
  const source = asRecord(input);

  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_LOCK_SCREEN_CONFIG.sleepSchedule.enabled,
    startTime: normalizeTime(
      source.startTime,
      DEFAULT_LOCK_SCREEN_CONFIG.sleepSchedule.startTime,
    ),
    endTime: normalizeTime(
      source.endTime,
      DEFAULT_LOCK_SCREEN_CONFIG.sleepSchedule.endTime,
    ),
    days: normalizeLockScreenSleepDays(source.days),
  };
}

function normalizeLockScreenSleepDays(input: unknown): LockScreenWeekDay[] {
  if (!Array.isArray(input)) {
    return [...DEFAULT_LOCK_SCREEN_CONFIG.sleepSchedule.days];
  }

  const seen = new Set<LockScreenWeekDay>();

  for (const value of input) {
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      LOCK_SCREEN_WEEK_DAYS.includes(value as LockScreenWeekDay)
    ) {
      seen.add(value as LockScreenWeekDay);
    }
  }

  return LOCK_SCREEN_WEEK_DAYS.filter((day) => seen.has(day));
}

function normalizeTime(value: unknown, fallback: string) {
  const candidate = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
}

function parseTimeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  const candidate = String(value || "").trim().replace(/\s+/g, " ");
  return candidate ? candidate.slice(0, maxLength) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundAlpha(value: number) {
  return Number(value.toFixed(2));
}

function normalizeHexColor(value: unknown, fallback: string) {
  const candidate = String(value || "").trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate)
    ? candidate
    : fallback;
}

function isSafeExternalUrl(value: unknown): boolean {
  const candidate = String(value || "").trim();
  if (!candidate) return false;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
