import { AlertTriangle, Clock3, Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  buildLockScreenOverlayBackground,
  type LockScreenConfig,
  normalizeLockScreenConfig,
  parseLockScreenPlaylist,
  resolveLockScreenCanvasBackground,
  resolveNasaApodImageUrl,
  resolvePlaylistImageUrl,
} from "@/layouts/lock-screen-config";
import { cn } from "@/lib/utils";

const NASA_APOD_CACHE_KEY = "prometeo.client.nasa-apod";

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
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

export function LockScreenSettingsPanel({
  initialConfig,
  onSave,
  saveLabel = "Save lock screen",
}: {
  initialConfig?: LockScreenConfig;
  onSave: (config: LockScreenConfig) => Promise<void>;
  saveLabel?: string;
}) {
  const normalizedInitialConfig = useMemo(
    () => normalizeLockScreenConfig(initialConfig),
    [initialConfig],
  );

  const [draft, setDraft] = useState<LockScreenConfig>(() =>
    normalizedInitialConfig,
  );
  const [playlistText, setPlaylistText] = useState<string>(() =>
    normalizedInitialConfig.playlist.join("\n"),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

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
      JSON.stringify(normalizedCurrentConfig) !==
      JSON.stringify(normalizedInitialConfig),
    [normalizedCurrentConfig, normalizedInitialConfig],
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
                  <span className="text-muted-foreground">{draft.blurPx}px</span>
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
                <span className="text-muted-foreground">{draft.clockScale}%</span>
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
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <LockScreenPreview config={previewConfig} now={now} />

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
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function LockScreenPreview({
  config,
  now,
}: {
  config: LockScreenConfig;
  now: Date;
}) {
  const [nasaApodImageUrl, setNasaApodImageUrl] = useState<string | null>(null);
  const [isNasaApodLoading, setIsNasaApodLoading] = useState(false);
  const [nasaApodError, setNasaApodError] = useState<string | null>(null);

  useEffect(() => {
    if (config.backgroundMode !== "nasa-apod") {
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
        const apiKey = String(import.meta.env.VITE_NASA_APOD_API_KEY || "").trim();
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
  }, [config.backgroundMode]);

  const previewImageUrl = useMemo(() => {
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
  }, [config, now, nasaApodImageUrl]);

  const shellBackground = useMemo(
    () =>
      resolveLockScreenCanvasBackground(config) ??
      getNeutralPreviewBackground(config.backgroundMode),
    [config],
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
    config.backgroundMode === "nasa-apod"
      ? isNasaApodLoading
        ? "Fetching APOD..."
        : nasaApodError
          ? "APOD unavailable"
          : previewImageUrl
            ? "APOD ready"
            : "APOD fallback"
      : null;
  const previewHint = getPreviewHint({
    mode: config.backgroundMode,
    imageUrl: previewImageUrl,
    nasaError: nasaApodError,
    isNasaLoading: isNasaApodLoading,
  });

  return (
    <aside className="space-y-4">
      <div className="space-y-1 px-1">
        <h3 className="text-sm font-semibold tracking-[0.04em]">Preview</h3>
        <p className="text-xs text-muted-foreground">
          Live rendering with your current settings.
        </p>
      </div>

      <div className="relative  overflow-hidden rounded-[26px] border bg-black text-white shadow-[0_30px_90px_-45px_rgba(0,0,0,0.85)] w-full "
        style={{
          aspectRatio: "16 / 9",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: shellBackground }}
        />

        {previewImageUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 scale-105 bg-cover bg-center"
            style={{
              backgroundImage: `url(${previewImageUrl})`,
              filter: `blur(${config.blurPx}px) saturate(1.04) brightness(0.92)`,
            }}
          />
        ) : null}

        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: buildLockScreenOverlayBackground(config.overlayOpacity),
          }}
        />

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

        {previewHint ? (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/75 backdrop-blur-sm">
            {previewHint}
          </div>
        ) : null}
      </div>
    </aside>
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
          config.clockPosition === "center" ? "text-center" : "text-left",
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
        config.clockPosition === "center" && "text-center",
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
  if (position === "top-left") return "items-start justify-start";
  if (position === "top-right") return "items-start justify-end";
  if (position === "bottom-left") return "items-end justify-start";
  if (position === "bottom-right") return "items-end justify-end";
  return "items-center justify-center";
}

function getScaleOrigin(position: LockScreenConfig["clockPosition"]) {
  if (position === "top-left") return "top left";
  if (position === "top-right") return "top right";
  if (position === "bottom-left") return "bottom left";
  if (position === "bottom-right") return "bottom right";
  return "center center";
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

function getNeutralPreviewBackground(
  mode: LockScreenConfig["backgroundMode"],
) {
  if (mode === "nasa-apod") {
    return "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at 72% 18%, rgba(255,255,255,0.06), transparent 18%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.04), transparent 24%), linear-gradient(180deg, #000000 0%, #090909 100%)";
  }

  return "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(255,255,255,0.05), transparent 26%), linear-gradient(180deg, #000000 0%, #0a0a0a 100%)";
}

function normalizeColorInput(color: string) {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)
    ? color
    : "#f8fafc";
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

function readNasaApodCache():
  | {
      date: string;
      imageUrl: string;
    }
  | null {
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
