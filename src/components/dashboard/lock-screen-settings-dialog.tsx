import {
  AlertTriangle,
  Clock3,
  CloudSun,
  Loader2,
  Moon,
  Music2,
  RotateCcw,
  Save,
  type LucideIcon,
} from "lucide-react";
import {
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  buildLockScreenOverlayBackground,
  isLockScreenSleepScheduleActive,
  type LockScreenConfig,
  type LockScreenWeekDay,
  LOCK_SCREEN_WIDGET_IDS,
  type LockScreenWidgetId,
  normalizeLockScreenConfig,
  parseLockScreenPlaylist,
  resolveLockScreenCanvasBackground,
  resolveNasaApodImageUrl,
  resolvePlaylistImageUrl,
} from "@/layouts/lock-screen-config";
import { SharedContext } from "@/contexts/SharedContext";
import { cn } from "@/lib/utils";
import { SharedKeys, type MediaSession } from "@/types/shared";

const NASA_APOD_CACHE_KEY = "prometeo.client.nasa-apod";
const PREVIEW_CANVAS_WIDTH = 1024;
const PREVIEW_CANVAS_HEIGHT = 600;

const BACKGROUND_OPTIONS: Array<{
  value: LockScreenConfig["backgroundMode"];
  label: string;
  hint: string;
}> = [
  {
    value: "media-artwork",
    label: "Live artwork",
    hint: "Uses currently playing media artwork whenever it is available.",
  },
  {
    value: "nasa-apod",
    label: "NASA APOD",
    hint: "Pulls the Astronomy Picture of the Day automatically.",
  },
  {
    value: "single-image",
    label: "Single image",
    hint: "A fixed image URL for a stable lock-screen look.",
  },
  {
    value: "playlist",
    label: "Image album",
    hint: "Rotate through multiple image URLs like a lightweight album.",
  },
  {
    value: "solid-color",
    label: "Solid color",
    hint: "A clean monochrome background for minimal lock screens.",
  },
  {
    value: "gradient",
    label: "Gradient",
    hint: "A custom two-color gradient for a more designed look.",
  },
];

const CLOCK_STYLE_OPTIONS: Array<{
  value: LockScreenConfig["clockStyle"];
  label: string;
}> = [
  { value: "glass", label: "Glass" },
  { value: "minimal", label: "Minimal" },
  { value: "poster", label: "Poster" },
  { value: "terminal", label: "Terminal" },
  { value: "capsule", label: "Capsule" },
];

const CLOCK_POSITION_OPTIONS: Array<{
  value: LockScreenConfig["clockPosition"];
  label: string;
}> = [
  { value: "center", label: "Center" },
  { value: "center-left", label: "Center left" },
  { value: "center-right", label: "Center right" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

const LOCK_WIDGET_OPTIONS: Array<{
  value: LockScreenWidgetId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "now-playing",
    label: "Now playing",
    description: "A boxed media card fed by Spotify or Hermes media state.",
    icon: Music2,
  },
  {
    value: "weather",
    label: "Weather",
    description:
      "Current city temperature, condition, wind and feels-like data.",
    icon: CloudSun,
  },
];

const WEATHER_UNIT_OPTIONS: Array<{
  value: LockScreenConfig["weatherUnits"];
  label: string;
}> = [
  { value: "metric", label: "Metric" },
  { value: "imperial", label: "Imperial" },
];

const WEATHER_LANGUAGE_OPTIONS: Array<{
  value: LockScreenConfig["weatherLanguage"];
  label: string;
}> = [
  { value: "es", label: "Spanish" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

const SLEEP_DAY_OPTIONS: Array<{
  value: LockScreenWeekDay;
  label: string;
  shortLabel: string;
}> = [
  { value: 1, label: "Monday", shortLabel: "Mo" },
  { value: 2, label: "Tuesday", shortLabel: "Tu" },
  { value: 3, label: "Wednesday", shortLabel: "We" },
  { value: 4, label: "Thursday", shortLabel: "Th" },
  { value: 5, label: "Friday", shortLabel: "Fr" },
  { value: 6, label: "Saturday", shortLabel: "Sa" },
  { value: 0, label: "Sunday", shortLabel: "Su" },
];
const SLEEP_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, "0"),
);
const SLEEP_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  index.toString().padStart(2, "0"),
);

function useOptionalSharedValue<T>(key: string): T | undefined {
  const context = useContext(SharedContext);
  const [value, setValue] = useState<T | undefined>(() =>
    context?.getShared<T>(key),
  );

  useEffect(() => {
    if (!context) {
      setValue(undefined);
      return;
    }

    setValue(context.getShared<T>(key));
    return context.subscribe<T>(key, setValue);
  }, [context, key]);

  return value;
}

function useScaledPreviewCanvas() {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateScale = () => {
      const width = frame.clientWidth || PREVIEW_CANVAS_WIDTH;
      setScale(width / PREVIEW_CANVAS_WIDTH);
    };

    updateScale();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateScale);
      observer.observe(frame);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return { frameRef, scale };
}

export function LockScreenSettingsPanel({
  initialConfig,
  onSave,
  saveLabel = "Save lock screen",
  forceHasChanges = false,
}: {
  initialConfig?: LockScreenConfig;
  onSave: (config: LockScreenConfig) => Promise<void>;
  saveLabel?: string;
  forceHasChanges?: boolean;
}) {
  const normalizedInitialConfig = useMemo(
    () => normalizeLockScreenConfig(initialConfig),
    [initialConfig],
  );

  const [draft, setDraft] = useState<LockScreenConfig>(
    () => normalizedInitialConfig,
  );
  const [playlistText, setPlaylistText] = useState<string>(() =>
    normalizedInitialConfig.playlist.join("\n"),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const mediaSession = useOptionalSharedValue<MediaSession>(
    SharedKeys.MEDIA_SESSION,
  );

  useEffect(() => {
    setDraft(normalizedInitialConfig);
    setPlaylistText(normalizedInitialConfig.playlist.join("\n"));
    setError(null);
  }, [normalizedInitialConfig]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const parsedPlaylist = useMemo(
    () => parseLockScreenPlaylist(playlistText),
    [playlistText],
  );

  const previewConfig = useMemo(
    () => ({
      ...draft,
      playlist: parsedPlaylist,
    }),
    [draft, parsedPlaylist],
  );

  const normalizedCurrentConfig = useMemo(
    () => normalizeLockScreenConfig(previewConfig),
    [previewConfig],
  );

  const hasChanges = useMemo(
    () =>
      forceHasChanges ||
      JSON.stringify(normalizedCurrentConfig) !==
        JSON.stringify(normalizedInitialConfig),
    [forceHasChanges, normalizedCurrentConfig, normalizedInitialConfig],
  );

  const backgroundHint = useMemo(
    () =>
      BACKGROUND_OPTIONS.find((option) => option.value === draft.backgroundMode)
        ?.hint ?? "",
    [draft.backgroundMode],
  );

  const playlistSummary =
    parsedPlaylist.length === 0
      ? "No valid image URLs yet"
      : `${parsedPlaylist.length} image${parsedPlaylist.length === 1 ? "" : "s"} ready`;
  const enabledWidgetCount = draft.enabledWidgets.length;

  function handleWidgetToggle(widgetId: LockScreenWidgetId, checked: boolean) {
    setDraft((current) => {
      const enabledSet = new Set(current.enabledWidgets);

      if (checked) {
        enabledSet.add(widgetId);
      } else {
        enabledSet.delete(widgetId);
      }

      return {
        ...current,
        enabledWidgets: LOCK_SCREEN_WIDGET_IDS.filter((id) =>
          enabledSet.has(id),
        ),
      };
    });
  }

  function handleSleepDayToggle(day: LockScreenWeekDay, checked: boolean) {
    setDraft((current) => {
      const selectedDays = new Set(current.sleepSchedule.days);

      if (checked) {
        selectedDays.add(day);
      } else {
        selectedDays.delete(day);
      }

      return {
        ...current,
        sleepSchedule: {
          ...current.sleepSchedule,
          days: SLEEP_DAY_OPTIONS.map((option) => option.value).filter((value) =>
            selectedDays.has(value),
          ),
        },
      };
    });
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        ...draft,
        playlist: parsedPlaylist,
      });
    } catch (saveError) {
      setError(
        (saveError as Error)?.message ||
          "I couldn't save the lock-screen settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setDraft(normalizedInitialConfig);
    setPlaylistText(normalizedInitialConfig.playlist.join("\n"));
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Clock3 className="size-5" />
              Lock screen
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure global lock-screen background and clock treatment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={hasChanges ? "default" : "secondary"}>
              {hasChanges ? "Unsaved changes" : "All changes saved"}
            </Badge>
            <Badge variant="outline">
              {
                BACKGROUND_OPTIONS.find(
                  (option) => option.value === draft.backgroundMode,
                )?.label
              }
            </Badge>
            <Badge variant="outline">
              {enabledWidgetCount} lock widget
              {enabledWidgetCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(470px,0.95fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(560px,1fr)]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-xl border bg-card/60 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Background</h3>
              <p className="text-sm text-muted-foreground">{backgroundHint}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lock-background-mode">Source</Label>
              <Select
                value={draft.backgroundMode}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    backgroundMode: value as LockScreenConfig["backgroundMode"],
                  }))
                }
              >
                <SelectTrigger id="lock-background-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.backgroundMode === "single-image" ? (
              <div className="space-y-2">
                <Label htmlFor="lock-image-url">Image URL</Label>
                <Input
                  id="lock-image-url"
                  value={draft.imageUrl}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                  placeholder="https://images.example.com/background.jpg"
                />
              </div>
            ) : null}

            {draft.backgroundMode === "playlist" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="lock-playlist">Album image URLs</Label>
                    <p className="text-xs text-muted-foreground">
                      One image URL per line.
                    </p>
                  </div>
                  <Badge variant="outline">{playlistSummary}</Badge>
                </div>
                <Textarea
                  id="lock-playlist"
                  value={playlistText}
                  onChange={(event) => setPlaylistText(event.target.value)}
                  rows={7}
                  placeholder={[
                    "https://images.example.com/one.jpg",
                    "https://images.example.com/two.jpg",
                    "https://images.example.com/three.jpg",
                  ].join("\n")}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Label htmlFor="lock-playlist-interval">
                      Rotation interval
                    </Label>
                    <span className="text-muted-foreground">
                      {draft.playlistIntervalSeconds}s
                    </span>
                  </div>
                  <Slider
                    id="lock-playlist-interval"
                    min={15}
                    max={180}
                    step={5}
                    value={[draft.playlistIntervalSeconds]}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        playlistIntervalSeconds: Math.max(15, value[0] ?? 15),
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            {draft.backgroundMode === "solid-color" ? (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <div className="space-y-2">
                  <Label htmlFor="lock-solid-color">Solid color</Label>
                  <Input
                    id="lock-solid-color"
                    value={draft.solidColor}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        solidColor: event.target.value,
                      }))
                    }
                    placeholder="#050505"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lock-solid-color-picker">Picker</Label>
                  <Input
                    id="lock-solid-color-picker"
                    type="color"
                    value={normalizeColorInput(draft.solidColor)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        solidColor: event.target.value,
                      }))
                    }
                    className="h-10 p-1"
                  />
                </div>
              </div>
            ) : null}

            {draft.backgroundMode === "gradient" ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lock-gradient-from">Gradient from</Label>
                    <Input
                      id="lock-gradient-from"
                      value={draft.gradientFrom}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          gradientFrom: event.target.value,
                        }))
                      }
                      placeholder="#050505"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lock-gradient-to">Gradient to</Label>
                    <Input
                      id="lock-gradient-to"
                      value={draft.gradientTo}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          gradientTo: event.target.value,
                        }))
                      }
                      placeholder="#202020"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
                  <Input
                    type="color"
                    value={normalizeColorInput(draft.gradientFrom)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        gradientFrom: event.target.value,
                      }))
                    }
                    className="h-10 p-1"
                    aria-label="Gradient from picker"
                  />
                  <Input
                    type="color"
                    value={normalizeColorInput(draft.gradientTo)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        gradientTo: event.target.value,
                      }))
                    }
                    className="h-10 p-1"
                    aria-label="Gradient to picker"
                  />
                  <div className="flex items-center justify-center rounded-md border text-sm text-muted-foreground">
                    {draft.gradientAngle}deg
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Label htmlFor="lock-gradient-angle">Gradient angle</Label>
                    <span className="text-muted-foreground">
                      {draft.gradientAngle}deg
                    </span>
                  </div>
                  <Slider
                    id="lock-gradient-angle"
                    min={0}
                    max={360}
                    step={5}
                    value={[draft.gradientAngle]}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        gradientAngle: Math.max(0, value[0] ?? 0),
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Label htmlFor="lock-overlay-opacity">Darkening</Label>
                  <span className="text-muted-foreground">
                    {draft.overlayOpacity}%
                  </span>
                </div>
                <Slider
                  id="lock-overlay-opacity"
                  min={0}
                  max={90}
                  step={5}
                  value={[draft.overlayOpacity]}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      overlayOpacity: Math.max(0, value[0] ?? 0),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Label htmlFor="lock-blur">Blur</Label>
                  <span className="text-muted-foreground">
                    {draft.blurPx}px
                  </span>
                </div>
                <Slider
                  id="lock-blur"
                  min={0}
                  max={24}
                  step={1}
                  value={[draft.blurPx]}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      blurPx: Math.max(0, value[0] ?? 0),
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card/60 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Clock</h3>
              <p className="text-sm text-muted-foreground">
                Tune the lock-screen clock without affecting widget layout.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lock-clock-style">Style</Label>
                <Select
                  value={draft.clockStyle}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      clockStyle: value as LockScreenConfig["clockStyle"],
                    }))
                  }
                >
                  <SelectTrigger id="lock-clock-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOCK_STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lock-clock-position">Position</Label>
                <Select
                  value={draft.clockPosition}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      clockPosition: value as LockScreenConfig["clockPosition"],
                    }))
                  }
                >
                  <SelectTrigger id="lock-clock-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOCK_POSITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div className="space-y-2">
                <Label htmlFor="lock-accent-color">Accent color</Label>
                <Input
                  id="lock-accent-color"
                  value={draft.accentColor}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      accentColor: event.target.value,
                    }))
                  }
                  placeholder="#f8fafc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lock-accent-color-picker">Picker</Label>
                <Input
                  id="lock-accent-color-picker"
                  type="color"
                  value={normalizeColorInput(draft.accentColor)}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      accentColor: event.target.value,
                    }))
                  }
                  className="h-10 p-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <Label htmlFor="lock-clock-scale">Clock scale</Label>
                <span className="text-muted-foreground">
                  {draft.clockScale}%
                </span>
              </div>
              <Slider
                id="lock-clock-scale"
                min={80}
                max={140}
                step={5}
                value={[draft.clockScale]}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    clockScale: Math.max(80, value[0] ?? 80),
                  }))
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <ToggleCard
                title="Show seconds"
                description="Adds a more live, technical feel."
                checked={draft.showSeconds}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    showSeconds: Boolean(checked),
                  }))
                }
              />
              <ToggleCard
                title="24-hour time"
                description="Turn this off if you prefer AM / PM."
                checked={draft.use24Hour}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    use24Hour: Boolean(checked),
                  }))
                }
              />
              <ToggleCard
                title="Show date"
                description="Hide the date for a cleaner composition."
                checked={draft.showDate}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    showDate: Boolean(checked),
                  }))
                }
              />
            </div>
          </section>

          <section className="flex flex-col gap-5 rounded-xl border bg-card/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl border bg-background text-muted-foreground transition-colors",
                    draft.sleepSchedule.enabled &&
                      "border-primary/30 bg-primary/5 text-primary",
                  )}
                >
                  <Moon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Sleep hours</h3>
                  <p className="mt-1 max-w-[64ch] text-sm leading-6 text-muted-foreground">
                    During this schedule the lock screen turns fully black and
                    keeps only a very dim clock visible.
                  </p>
                </div>
              </div>

              <div className="flex h-10 items-center gap-3 rounded-full border bg-background/55 px-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {draft.sleepSchedule.enabled ? "Enabled" : "Off"}
                </span>
                <Switch
                  checked={draft.sleepSchedule.enabled}
                  onCheckedChange={(checked) =>
                    setDraft((current) => ({
                      ...current,
                      sleepSchedule: {
                        ...current.sleepSchedule,
                        enabled: Boolean(checked),
                      },
                    }))
                  }
                  aria-label="Enable sleep hours"
                />
              </div>
            </div>

            <div className="grid gap-5 border-t pt-5 md:grid-cols-[minmax(18rem,19rem)_minmax(0,1fr)] md:items-start">
              <div className="grid gap-3 sm:grid-cols-2">
                <SleepTimeSelect
                  id="lock-sleep-start-time"
                  label="From"
                  value={draft.sleepSchedule.startTime}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      sleepSchedule: {
                        ...current.sleepSchedule,
                        startTime: value,
                      },
                    }))
                  }
                />
                <SleepTimeSelect
                  id="lock-sleep-end-time"
                  label="To"
                  value={draft.sleepSchedule.endTime}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      sleepSchedule: {
                        ...current.sleepSchedule,
                        endTime: value,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex h-6 items-center justify-between gap-3">
                  <Label>Days</Label>
                  <Badge variant="outline">
                    {draft.sleepSchedule.days.length || "No"} selected
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {SLEEP_DAY_OPTIONS.map((day) => {
                    const id = `lock-sleep-day-${day.value}`;
                    const checked = draft.sleepSchedule.days.includes(day.value);

                    return (
                      <Button
                        key={day.value}
                        id={id}
                        type="button"
                        variant={checked ? "default" : "outline"}
                        size="sm"
                        aria-pressed={checked}
                        aria-label={`${checked ? "Disable" : "Enable"} ${
                          day.label
                        }`}
                        onClick={() => handleSleepDayToggle(day.value, !checked)}
                        className={cn(
                          "h-10 min-w-0 rounded-lg px-0 text-xs font-semibold",
                          !checked && "bg-background/70 text-muted-foreground",
                        )}
                      >
                        {day.shortLabel}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card/60 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Lock widgets</h3>
              <p className="text-sm text-muted-foreground">
                Enable fixed information boxes for the lock screen. These are
                not dashboard widgets, so they keep a consistent boxed layout.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {LOCK_WIDGET_OPTIONS.map((option) => (
                <ToggleCard
                  key={option.value}
                  title={option.label}
                  description={option.description}
                  icon={option.icon}
                  checked={draft.enabledWidgets.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleWidgetToggle(option.value, Boolean(checked))
                  }
                />
              ))}
            </div>

            {draft.enabledWidgets.includes("weather") ? (
              <div className="grid gap-4 rounded-xl border bg-background/45 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                <div className="space-y-2">
                  <Label htmlFor="lock-weather-city">Weather city</Label>
                  <Input
                    id="lock-weather-city"
                    value={draft.weatherCity}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        weatherCity: event.target.value,
                      }))
                    }
                    placeholder="Madrid"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lock-weather-units">Units</Label>
                  <Select
                    value={draft.weatherUnits}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        weatherUnits: value as LockScreenConfig["weatherUnits"],
                      }))
                    }
                  >
                    <SelectTrigger id="lock-weather-units">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_UNIT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lock-weather-language">Language</Label>
                  <Select
                    value={draft.weatherLanguage}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        weatherLanguage:
                          value as LockScreenConfig["weatherLanguage"],
                      }))
                    }
                  >
                    <SelectTrigger id="lock-weather-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <LockScreenPreview
            config={previewConfig}
            mediaSession={mediaSession}
            now={now}
          />

          <div className="rounded-xl border bg-card/70 p-3">
            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Changes apply globally after saving.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving || !hasChanges}
              >
                <RotateCcw className="mr-2 size-4" />
                Reset
              </Button>
              <Button
                onClick={() => void handleSubmit()}
                disabled={isSaving || !hasChanges}
              >
                <Save className="mr-2 size-4" />
                {isSaving ? "Saving..." : saveLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  icon: Icon,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 transition-colors",
        checked && "border-primary/35 bg-primary/5",
      )}
    >
      <div className="flex min-w-0 gap-3">
        {Icon ? (
          <div
            className={cn(
              "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground",
              checked && "border-primary/30 text-primary",
            )}
          >
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1"
      />
    </div>
  );
}

function SleepTimeSelect({
  id,
  label,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [hour, minute] = splitTimeValue(value);

  return (
    <div id={id} className="flex min-w-0 flex-col gap-2">
      <div className="flex h-6 items-center">
        <Label htmlFor={`${id}-hour`}>{label}</Label>
      </div>
      <div className="grid h-11 grid-cols-[minmax(0,1fr)_0.875rem_minmax(0,1fr)] items-center rounded-xl border bg-background/70 px-1 shadow-xs">
        <Select
          value={hour}
          onValueChange={(nextHour) =>
            onValueChange(composeTimeValue(nextHour, minute))
          }
        >
          <SelectTrigger
            id={`${id}-hour`}
            aria-label={`${label} hour`}
            className="h-8 w-full justify-center gap-1 rounded-lg border-0 bg-transparent px-1 text-base font-semibold tabular-nums shadow-none hover:bg-muted/45 focus:ring-0 dark:hover:bg-muted/35 [&>svg]:size-3.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectGroup>
              {SLEEP_HOUR_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <span className="grid h-8 place-items-center text-sm font-semibold leading-none text-muted-foreground">
          :
        </span>

        <Select
          value={minute}
          onValueChange={(nextMinute) =>
            onValueChange(composeTimeValue(hour, nextMinute))
          }
        >
          <SelectTrigger
            id={`${id}-minute`}
            aria-label={`${label} minute`}
            className="h-8 w-full justify-center gap-1 rounded-lg border-0 bg-transparent px-1 text-base font-semibold tabular-nums shadow-none hover:bg-muted/45 focus:ring-0 dark:hover:bg-muted/35 [&>svg]:size-3.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectGroup>
              {SLEEP_MINUTE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function LockScreenPreview({
  config,
  mediaSession,
  now,
}: {
  config: LockScreenConfig;
  mediaSession?: MediaSession | null;
  now: Date;
}) {
  const [nasaApodImageUrl, setNasaApodImageUrl] = useState<string | null>(null);
  const [isNasaApodLoading, setIsNasaApodLoading] = useState(false);
  const [nasaApodError, setNasaApodError] = useState<string | null>(null);
  const isSleepModeActive = isLockScreenSleepScheduleActive(
    config.sleepSchedule,
    now,
  );

  useEffect(() => {
    if (isSleepModeActive || config.backgroundMode !== "nasa-apod") {
      setNasaApodImageUrl(null);
      setIsNasaApodLoading(false);
      setNasaApodError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const hydrateNasaApod = async () => {
      setIsNasaApodLoading(true);
      setNasaApodError(null);

      const today = new Date().toISOString().slice(0, 10);
      const cached = readNasaApodCache();

      if (cached?.date === today && cached.imageUrl) {
        if (!cancelled) {
          setNasaApodImageUrl(cached.imageUrl);
          setIsNasaApodLoading(false);
        }
        return;
      }

      try {
        const apiKey = String(
          import.meta.env.VITE_NASA_APOD_API_KEY || "",
        ).trim();
        const response = await fetch(
          `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(
            apiKey || "DEMO_KEY",
          )}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`NASA APOD returned ${response.status}`);
        }

        const payload = await response.json();
        const imageUrl = resolveNasaApodImageUrl(payload);

        if (cancelled) return;

        if (imageUrl) {
          setNasaApodImageUrl(imageUrl);
          writeNasaApodCache({ date: today, imageUrl });
        } else {
          setNasaApodImageUrl(null);
          setNasaApodError("NASA APOD returned non-image media today.");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[lock-screen-preview] nasa-apod-error", error);
        setNasaApodImageUrl(null);
        setNasaApodError("Could not load NASA APOD image.");
      } finally {
        if (!cancelled) {
          setIsNasaApodLoading(false);
        }
      }
    };

    void hydrateNasaApod();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [config.backgroundMode, isSleepModeActive]);

  const previewImageUrl = useMemo(() => {
    if (isSleepModeActive) {
      return null;
    }

    if (config.backgroundMode === "nasa-apod") {
      return nasaApodImageUrl;
    }

    if (config.backgroundMode === "single-image") {
      return config.imageUrl || null;
    }

    if (config.backgroundMode === "playlist") {
      return resolvePlaylistImageUrl(
        config.playlist,
        now.getTime(),
        config.playlistIntervalSeconds,
      );
    }

    return null;
  }, [config, isSleepModeActive, now, nasaApodImageUrl]);

  const shellBackground = useMemo(
    () =>
      isSleepModeActive
        ? "#000000"
        : resolveLockScreenCanvasBackground(config) ??
          getNeutralPreviewBackground(config.backgroundMode),
    [config, isSleepModeActive],
  );

  const previewLabel = getPreviewLabel(config.backgroundMode);
  const timeLabel = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: config.showSeconds ? "2-digit" : undefined,
    hour12: !config.use24Hour,
  });
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const backgroundStateLabel =
    !isSleepModeActive && config.backgroundMode === "nasa-apod"
      ? isNasaApodLoading
        ? "Fetching APOD..."
        : nasaApodError
          ? "APOD unavailable"
          : previewImageUrl
            ? "APOD ready"
            : "APOD fallback"
      : null;
  const previewHint = getPreviewHint({
    mode: isSleepModeActive ? "solid-color" : config.backgroundMode,
    imageUrl: previewImageUrl,
    nasaError: nasaApodError,
    isNasaLoading: isNasaApodLoading,
  });
  const { frameRef, scale: previewScale } = useScaledPreviewCanvas();

  return (
    <aside className="space-y-4">
      <div className="space-y-1 px-1">
        <h3 className="text-sm font-semibold tracking-[0.04em]">Preview</h3>
        <p className="text-xs text-muted-foreground">
          Live rendering with your current settings.
        </p>
      </div>

      <div
        ref={frameRef}
        className="relative w-full max-w-[1024px] overflow-hidden rounded-[26px] border bg-black shadow-[0_30px_90px_-45px_rgba(0,0,0,0.85)]"
        style={{
          aspectRatio: `${PREVIEW_CANVAS_WIDTH} / ${PREVIEW_CANVAS_HEIGHT}`,
        }}
      >
        <div
          className="absolute left-0 top-0 overflow-hidden bg-black text-white"
          style={{
            width: PREVIEW_CANVAS_WIDTH,
            height: PREVIEW_CANVAS_HEIGHT,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: shellBackground }}
          />

          {isSleepModeActive ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black">
              <div className="text-[5.8rem] font-semibold leading-none tracking-[-0.08em] tabular-nums text-white opacity-[0.16]">
                {timeLabel}
              </div>
            </div>
          ) : null}

          {!isSleepModeActive && previewImageUrl ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 scale-105 bg-cover bg-center"
              style={{
                backgroundImage: `url(${previewImageUrl})`,
                filter: `blur(${config.blurPx}px) saturate(1.04) brightness(0.92)`,
              }}
            />
          ) : null}

          {!isSleepModeActive ? (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: buildLockScreenOverlayBackground(
                  config.overlayOpacity,
                ),
              }}
            />
          ) : null}

          {!isSleepModeActive ? (
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="border-white/10 bg-white/10 text-white"
            >
              {previewLabel}
            </Badge>
            <Badge
              variant="secondary"
              className="border-white/10 bg-white/10 text-white"
            >
              {
                CLOCK_STYLE_OPTIONS.find(
                  (option) => option.value === config.clockStyle,
                )?.label
              }
            </Badge>
            {backgroundStateLabel ? (
              <Badge
                variant="secondary"
                className="border-white/10 bg-white/10 text-white"
              >
                {isNasaApodLoading ? (
                  <Loader2 className="mr-1.5 size-3 animate-spin" />
                ) : nasaApodError ? (
                  <AlertTriangle className="mr-1.5 size-3" />
                ) : null}
                {backgroundStateLabel}
              </Badge>
            ) : null}
            </div>
          ) : null}

          {!isSleepModeActive ? (
            <div
              className={cn(
                "relative z-10 flex h-full p-6",
                getPreviewPositionClass(config.clockPosition),
              )}
            >
              <div
                style={{
                  transform: `scale(${config.clockScale / 100})`,
                  transformOrigin: getScaleOrigin(config.clockPosition),
                }}
                className="w-full max-w-[20rem]"
              >
                <PreviewClockCard
                  config={config}
                  timeLabel={timeLabel}
                  dateLabel={dateLabel}
                />
              </div>
            </div>
          ) : null}

          {!isSleepModeActive ? (
            <PreviewWidgetRail config={config} mediaSession={mediaSession} />
          ) : null}

          {!isSleepModeActive && previewHint ? (
            <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/75 backdrop-blur-sm">
              {previewHint}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function PreviewWidgetRail({
  config,
  mediaSession,
}: {
  config: LockScreenConfig;
  mediaSession?: MediaSession | null;
}) {
  const showWeather = config.enabledWidgets.includes("weather");
  const showNowPlaying = config.enabledWidgets.includes("now-playing");

  if (!showWeather && !showNowPlaying) return null;

  return (
    <div className="absolute bottom-4 right-4 z-20 flex w-[min(42%,18rem)] min-w-[12rem] flex-col-reverse gap-2">
      {showNowPlaying ? (
        <PreviewNowPlayingWidget config={config} mediaSession={mediaSession} />
      ) : null}
      {showWeather ? <PreviewWeatherWidget config={config} /> : null}
    </div>
  );
}

function PreviewWeatherWidget({ config }: { config: LockScreenConfig }) {
  const isImperial = config.weatherUnits === "imperial";

  return (
    <PreviewInfoBox
      accent="#60a5fa"
      config={config}
      label={`Weather - ${config.weatherCity}`}
    >
      <div className="flex items-center gap-3">
        <div className="text-[2rem] font-semibold leading-none tracking-[-0.08em] tabular-nums">
          {isImperial ? "64" : "18"}°
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            Light clouds
          </p>
          <p className="truncate text-[11px] text-white/62">
            Feels {isImperial ? "63" : "17"}° · wind{" "}
            {isImperial ? "7 mph" : "11 km/h"}
          </p>
        </div>
      </div>
    </PreviewInfoBox>
  );
}

function PreviewNowPlayingWidget({
  config,
  mediaSession,
}: {
  config: LockScreenConfig;
  mediaSession?: MediaSession | null;
}) {
  const hasLiveMedia = mediaSession?.isPlaying === true;
  const previewTitle = hasLiveMedia
    ? mediaSession.title || "Untitled"
    : "Balada";
  const previewArtist = hasLiveMedia
    ? mediaSession.artist || mediaSession.album
    : "Natos y Waor, Charlie Hijos Bastardos";
  const previewTimestamp = hasLiveMedia ? mediaSession.timestamp : 6_000;
  const previewDuration = hasLiveMedia ? mediaSession.duration : 183_000;

  const progressValue =
    previewTimestamp && previewDuration
      ? Math.max(
          0,
          Math.min(100, (previewTimestamp / previewDuration) * 100),
        )
      : 0;
  const sourceLabel = String(
    hasLiveMedia
      ? mediaSession.sourceAppName ||
          mediaSession.provider ||
          mediaSession.source ||
          "media"
      : "Spotify",
  ).toUpperCase();

  return (
    <PreviewInfoBox
      accent="#34d399"
      config={config}
      label={`Now playing - ${sourceLabel}`}
    >
      <div className="flex items-center gap-3">
        {hasLiveMedia && mediaSession.artwork ? (
          <img
            src={mediaSession.artwork}
            alt={`${previewTitle} artwork`}
            className="size-12 shrink-0 rounded-xl border border-white/10 object-cover shadow-[0_14px_36px_rgba(0,0,0,0.32)]"
          />
        ) : (
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(135deg,#f97316,#facc15_42%,#8b5cf6)] shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
            {hasLiveMedia ? <Music2 className="size-4 text-white/75" /> : null}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {previewTitle}
          </p>
          <p className="truncate text-[11px] text-white/62">
            {previewArtist || sourceLabel}
          </p>
        </div>
      </div>

      {previewTimestamp && previewDuration ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-white/14">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/52">
            <span>{formatPreviewMediaTime(previewTimestamp)}</span>
            <span>{formatPreviewMediaTime(previewDuration)}</span>
          </div>
        </div>
      ) : null}
    </PreviewInfoBox>
  );
}

function PreviewInfoBox({
  accent,
  config,
  label,
  children,
}: {
  accent: string;
  config: LockScreenConfig;
  label: string;
  children: ReactNode;
}) {
  const widgetStyle = getPreviewInfoBoxStyle(config, accent);

  return (
    <div
      className={widgetStyle.className}
      style={widgetStyle.style}
    >
      <div className={widgetStyle.labelClassName}>
        {label}
      </div>
      {children}
    </div>
  );
}

function PreviewClockCard({
  config,
  timeLabel,
  dateLabel,
}: {
  config: LockScreenConfig;
  timeLabel: string;
  dateLabel: string;
}) {
  const accentShadow = `${hexToRgba(config.accentColor, 0.22)} 0px 0px 0px 1px`;

  if (config.clockStyle === "minimal") {
    return (
      <div
        className={cn(
          "space-y-3 text-white",
          getPreviewTextAlignClass(config.clockPosition),
        )}
      >
        <div
          className="text-[3.5rem] font-semibold leading-none tracking-[-0.08em] tabular-nums"
          style={{
            textShadow: `0 16px 40px ${hexToRgba(config.accentColor, 0.22)}`,
          }}
        >
          {timeLabel}
        </div>
        {config.showDate ? (
          <div className="text-sm uppercase tracking-[0.32em] text-white/72">
            {dateLabel}
          </div>
        ) : null}
      </div>
    );
  }

  if (config.clockStyle === "poster") {
    return (
      <div
        className="rounded-[26px] border border-white/10 bg-black/20 p-6 backdrop-blur-md"
        style={{
          boxShadow: `${accentShadow}, 0 24px 80px rgba(0, 0, 0, 0.42)`,
        }}
      >
        <div
          className="mb-4 h-1 w-16 rounded-full"
          style={{ backgroundColor: config.accentColor }}
        />
        <div className="text-xs uppercase tracking-[0.45em] text-white/60">
          LOCK SCREEN
        </div>
        <div className="mt-3 text-[3.4rem] font-semibold leading-none tracking-[-0.09em] tabular-nums">
          {timeLabel}
        </div>
        {config.showDate ? (
          <div className="mt-4 text-base text-white/80">{dateLabel}</div>
        ) : null}
      </div>
    );
  }

  if (config.clockStyle === "terminal") {
    return (
      <div
        className="rounded-[24px] border border-emerald-400/35 bg-black/80 p-6 font-mono text-emerald-300 shadow-2xl"
        style={{
          boxShadow: `0 0 0 1px ${hexToRgba(config.accentColor, 0.15)}, 0 24px 80px rgba(0, 0, 0, 0.52)`,
        }}
      >
        <div className="mb-3 text-xs uppercase tracking-[0.35em] text-emerald-400/75">
          SYSTEM IDLE
        </div>
        <div className="text-[3.2rem] font-semibold leading-none tabular-nums">
          {timeLabel}
        </div>
        {config.showDate ? (
          <div className="mt-4 text-sm text-emerald-300/72">{dateLabel}</div>
        ) : null}
      </div>
    );
  }

  if (config.clockStyle === "capsule") {
    return (
      <div
        className="rounded-full border border-white/12 bg-white/10 px-8 py-7 text-center shadow-2xl backdrop-blur-xl"
        style={{
          boxShadow: `${accentShadow}, 0 28px 90px rgba(0, 0, 0, 0.42)`,
        }}
      >
        <div
          className="mb-2 text-xs uppercase tracking-[0.34em]"
          style={{ color: hexToRgba(config.accentColor, 0.94) }}
        >
          PROMETEO
        </div>
        <div className="text-[3rem] font-semibold leading-none tracking-[-0.08em] tabular-nums">
          {timeLabel}
        </div>
        {config.showDate ? (
          <div className="mt-3 text-sm text-white/72">{dateLabel}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/[0.12] bg-white/10 px-6 py-7 shadow-2xl backdrop-blur-xl",
        getPreviewTextAlignClass(config.clockPosition),
      )}
      style={{
        boxShadow: `${accentShadow}, 0 28px 90px rgba(0, 0, 0, 0.42)`,
      }}
    >
      <div
        className="mb-4 text-xs uppercase tracking-[0.36em] text-white/70"
        style={{ color: hexToRgba(config.accentColor, 0.92) }}
      >
        Prometeo Client
      </div>
      <div className="text-[3.6rem] font-semibold leading-none tracking-[-0.08em] tabular-nums">
        {timeLabel}
      </div>
      {config.showDate ? (
        <div className="mt-4 text-base text-white/72">{dateLabel}</div>
      ) : null}
    </div>
  );
}

function getPreviewLabel(mode: LockScreenConfig["backgroundMode"]) {
  if (mode === "media-artwork") return "Live artwork";
  if (mode === "nasa-apod") return "NASA APOD";
  if (mode === "single-image") return "Single image";
  if (mode === "playlist") return "Image album";
  if (mode === "solid-color") return "Solid color";
  return "Gradient";
}

function getPreviewPositionClass(position: LockScreenConfig["clockPosition"]) {
  if (position === "center-left") return "items-center justify-start";
  if (position === "center-right") return "items-center justify-end";
  if (position === "top-left") return "items-start justify-start";
  if (position === "top-right") return "items-start justify-end";
  if (position === "bottom-left") return "items-end justify-start";
  if (position === "bottom-right") return "items-end justify-end";
  return "items-center justify-center";
}

function getPreviewTextAlignClass(position: LockScreenConfig["clockPosition"]) {
  if (position.includes("right")) {
    return "text-right";
  }

  if (position === "center") {
    return "text-center";
  }

  return "text-left";
}

function getScaleOrigin(position: LockScreenConfig["clockPosition"]) {
  if (position === "center-left") return "center left";
  if (position === "center-right") return "center right";
  if (position === "top-left") return "top left";
  if (position === "top-right") return "top right";
  if (position === "bottom-left") return "bottom left";
  if (position === "bottom-right") return "bottom right";
  return "center center";
}

function getPreviewInfoBoxStyle(
  config: Pick<LockScreenConfig, "accentColor" | "clockStyle">,
  accent: string,
): {
  className: string;
  labelClassName: string;
  style: CSSProperties;
} {
  const baseClassName =
    "border px-3.5 py-3 text-left transition-colors duration-200";
  const baseLabelClassName =
    "mb-2 text-[9px] font-semibold uppercase tracking-[0.36em]";

  if (config.clockStyle === "minimal") {
    return {
      className: cn(
        baseClassName,
        "rounded-[16px] border-white/12 bg-black/42 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-md",
      ),
      labelClassName: cn(baseLabelClassName, "text-white/44"),
      style: {
        boxShadow: `0 18px 45px rgba(0, 0, 0, 0.28), inset 0 1px 0 ${hexToRgba(
          accent,
          0.16,
        )}`,
      },
    };
  }

  if (config.clockStyle === "poster") {
    return {
      className: cn(
        baseClassName,
        "rounded-[22px] border-white/10 bg-black/24 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-md",
      ),
      labelClassName: cn(baseLabelClassName, "text-white/56"),
      style: {
        borderColor: hexToRgba(config.accentColor, 0.22),
        boxShadow: `0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.16,
        )}`,
      },
    };
  }

  if (config.clockStyle === "terminal") {
    return {
      className: cn(
        baseClassName,
        "rounded-[18px] border-emerald-400/35 bg-black/82 font-mono text-emerald-200 shadow-2xl [&_p]:text-emerald-200 [&_span]:text-emerald-300 [&_svg]:text-emerald-300",
      ),
      labelClassName: cn(baseLabelClassName, "text-emerald-400/72"),
      style: {
        boxShadow: `0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.15,
        )}, 0 20px 55px rgba(0, 0, 0, 0.48)`,
      },
    };
  }

  if (config.clockStyle === "capsule") {
    return {
      className: cn(
        baseClassName,
        "rounded-[24px] border-white/12 bg-white/10 shadow-[0_22px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl",
      ),
      labelClassName: cn(baseLabelClassName, "text-white/52"),
      style: {
        boxShadow: `0 22px 60px rgba(0, 0, 0, 0.38), 0 0 0 1px ${hexToRgba(
          config.accentColor,
          0.18,
        )}`,
      },
    };
  }

  return {
    className: cn(
      baseClassName,
      "rounded-[18px] shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl",
    ),
    labelClassName: cn(baseLabelClassName, "text-white/48"),
    style: {
      borderColor: hexToRgba(accent, 0.38),
      background: `linear-gradient(135deg, ${hexToRgba(
        accent,
        0.12,
      )}, rgba(10, 10, 14, 0.78))`,
    },
  };
}

function getPreviewHint({
  mode,
  imageUrl,
  nasaError,
  isNasaLoading,
}: {
  mode: LockScreenConfig["backgroundMode"];
  imageUrl: string | null;
  nasaError: string | null;
  isNasaLoading: boolean;
}) {
  if (mode === "media-artwork") {
    return "Live artwork appears when media is playing in the client.";
  }

  if (mode === "single-image" && !imageUrl) {
    return "Add a valid image URL to preview your selected background.";
  }

  if (mode === "playlist" && !imageUrl) {
    return "Add at least one valid image URL to rotate the background.";
  }

  if (mode === "nasa-apod") {
    if (isNasaLoading) {
      return "Loading NASA APOD from api.nasa.gov...";
    }
    if (nasaError) {
      return nasaError;
    }
    if (!imageUrl) {
      return "APOD image unavailable right now. Try saving and refreshing.";
    }
  }

  return null;
}

function formatPreviewMediaTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function splitTimeValue(value: string): [string, string] {
  const [hour = "00", minute = "00"] = value.split(":");
  const safeHour = SLEEP_HOUR_OPTIONS.includes(hour) ? hour : "00";
  const safeMinute = SLEEP_MINUTE_OPTIONS.includes(minute) ? minute : "00";

  return [safeHour, safeMinute];
}

function composeTimeValue(hour: string, minute: string) {
  const [safeHour] = splitTimeValue(`${hour}:00`);
  const [, safeMinute] = splitTimeValue(`00:${minute}`);

  return `${safeHour}:${safeMinute}`;
}

function getNeutralPreviewBackground(mode: LockScreenConfig["backgroundMode"]) {
  if (mode === "nasa-apod") {
    return "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.06), transparent 18%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.04), transparent 24%), linear-gradient(180deg, #000000 0%, #090909 100%)";
  }

  return "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(255,255,255,0.05), transparent 26%), linear-gradient(180deg, #000000 0%, #0a0a0a 100%)";
}

function normalizeColorInput(color: string) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : "#f8fafc";
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = normalizeColorInput(hex).replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const parsed = Number.parseInt(full, 16);
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function readNasaApodCache(): {
  date: string;
  imageUrl: string;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(NASA_APOD_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      date?: string;
      imageUrl?: string;
    };

    if (
      typeof parsed.date === "string" &&
      typeof parsed.imageUrl === "string" &&
      parsed.imageUrl
    ) {
      return { date: parsed.date, imageUrl: parsed.imageUrl };
    }
  } catch {
    return null;
  }

  return null;
}

function writeNasaApodCache(entry: { date: string; imageUrl: string }) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(NASA_APOD_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // noop
  }
}
