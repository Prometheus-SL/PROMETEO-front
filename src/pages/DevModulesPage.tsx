import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, Copy, Loader2, RotateCcw } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

import type { SharedAction } from "@/contexts/SharedContext";
import {
  MODULE_DEV_SESSION_STORAGE_KEY,
  MODULE_DEV_SURFACE_STYLES,
  ModuleDevRuntime,
  createDefaultModuleDevSession,
  loadModuleDevCatalog,
  loadModuleDevMockAdapter,
  parseModuleDevMockStateText,
  resolveModuleDevMockState,
  restoreModuleDevSession,
  serializeModuleDevSession,
  useModuleDevMocks,
} from "@/dev/modules";
import { SchemaForm } from "@/dev/modules/SchemaForm";
import type {
  ModuleDevCatalogItem,
  ModuleDevMockAdapter,
  ModuleDevPreset,
} from "@/dev/modules";
import { cn } from "@/lib/utils";
import { loadModuleDefinition } from "@/modules/loader";
import type { ModuleDefinition } from "@/modules/types";
import { useTheme } from "@/providers/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonRecord(
  text: string,
  fallback: Record<string, unknown>,
): { error: string | null; value: Record<string, unknown> } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        error: "Expected a JSON object.",
        value: fallback,
      };
    }

    return {
      error: null,
      value: parsed as Record<string, unknown>,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      value: fallback,
    };
  }
}

function parseActionDrafts(
  text: string,
  fallback: SharedAction[],
): { error: string | null; value: SharedAction[] } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        error: "Expected a JSON array of action drafts.",
        value: fallback,
      };
    }

    return {
      error: null,
      value: parsed.map((draft, index) => {
        const candidate =
          draft && typeof draft === "object" && !Array.isArray(draft)
            ? (draft as Record<string, unknown>)
            : {};
        const title = String(candidate.title ?? `Action ${index + 1}`);
        const widgetId = String(candidate.widgetId ?? "sandbox-widget");

        return {
          id: String(candidate.id ?? `${widgetId}:${index + 1}`),
          title,
          widgetId,
          description:
            typeof candidate.description === "string"
              ? candidate.description
              : undefined,
          intentTags: Array.isArray(candidate.intentTags)
            ? candidate.intentTags.filter(
                (tag): tag is string => typeof tag === "string",
              )
            : undefined,
          requiresConfirmation:
            typeof candidate.requiresConfirmation === "boolean"
              ? candidate.requiresConfirmation
              : undefined,
          run: async () => ({
            success: true,
            message:
              typeof candidate.message === "string"
                ? candidate.message
                : `${title} executed.`,
          }),
        } satisfies SharedAction;
      }),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      value: fallback,
    };
  }
}

function buildPresetDefaults(preset: ModuleDevPreset) {
  return {
    config: preset.config ?? {},
    configText: formatJson(preset.config ?? {}),
  };
}

function ControlField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex min-w-[10rem] flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const SELECT_CLASS_NAME =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export default function DevModulesPage() {
  const { setTheme } = useTheme();
  const [catalog, setCatalog] = useState<ModuleDevCatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState(() => createDefaultModuleDevSession());
  const [configSchema, setConfigSchema] =
    useState<ModuleDefinition["configSchema"]>();
  const [configText, setConfigText] = useState("{}");
  const [configValue, setConfigValue] = useState<Record<string, unknown>>({});
  const [configError, setConfigError] = useState<string | null>(null);
  const [sharedText, setSharedText] = useState("{}");
  const [sharedValue, setSharedValue] = useState<Record<string, unknown>>({});
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [actionsText, setActionsText] = useState("[]");
  const [actionsValue, setActionsValue] = useState<SharedAction[]>([]);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [mockAdapter, setMockAdapter] = useState<ModuleDevMockAdapter | null>(
    null,
  );
  const [mockAdapterEntryId, setMockAdapterEntryId] = useState<string | null>(
    null,
  );
  const [isLoadingMockAdapter, setIsLoadingMockAdapter] = useState(false);
  const [mockStateText, setMockStateText] = useState("{}");
  const [mockStateValue, setMockStateValue] = useState<Record<string, unknown>>(
    {},
  );
  const [mockStateError, setMockStateError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [configJsonOpen, setConfigJsonOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoadingCatalog(true);
        setCatalog(await loadModuleDevCatalog());
        setCatalogError(null);
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoadingCatalog(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!catalog.length || hydrated) {
      return;
    }

    const firstEntryId = catalog[0]?.entry.meta.id ?? null;
    const raw =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(MODULE_DEV_SESSION_STORAGE_KEY);

    setSession(restoreModuleDevSession(raw, firstEntryId));
    setHydrated(true);
  }, [catalog, hydrated]);

  useEffect(() => {
    setTheme(session.theme);
  }, [session.theme, setTheme]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    if (session.persist) {
      window.localStorage.setItem(
        MODULE_DEV_SESSION_STORAGE_KEY,
        serializeModuleDevSession(session),
      );
      return;
    }

    window.localStorage.removeItem(MODULE_DEV_SESSION_STORAGE_KEY);
  }, [hydrated, session]);

  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const filteredCatalog = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return catalog;
    }

    return catalog.filter((item) => {
      return [
        item.entry.meta.id,
        item.entry.meta.name,
        item.entry.meta.description,
        item.entry.basePath,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [catalog, search]);

  const selectedEntryId = useMemo(() => {
    if (!catalog.length) {
      return null;
    }

    if (session.selectedEntryId) {
      const existing = catalog.find(
        (item) => item.entry.meta.id === session.selectedEntryId,
      );
      if (existing) {
        return existing.entry.meta.id;
      }
    }

    return catalog[0].entry.meta.id;
  }, [catalog, session.selectedEntryId]);

  const selectedItem = useMemo(() => {
    if (!selectedEntryId) {
      return null;
    }

    return (
      catalog.find((item) => item.entry.meta.id === selectedEntryId) ?? null
    );
  }, [catalog, selectedEntryId]);

  const selectedPreset = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return (
      selectedItem.presets.find((preset) => preset.id === session.presetId) ??
      selectedItem.defaultPreset
    );
  }, [selectedItem, session.presetId]);

  useEffect(() => {
    if (!selectedEntryId || !selectedPreset) {
      return;
    }

    setSession((previous) => {
      if (
        previous.selectedEntryId === selectedEntryId &&
        previous.presetId === selectedPreset.id
      ) {
        return previous;
      }

      return {
        ...previous,
        selectedEntryId,
        presetId: selectedPreset.id,
      };
    });
  }, [selectedEntryId, selectedPreset]);

  useEffect(() => {
    if (!selectedItem) {
      setConfigSchema(undefined);
      return;
    }

    let cancelled = false;

    void (async () => {
      const definition = await loadModuleDefinition(selectedItem.entry);
      if (!cancelled) {
        setConfigSchema(definition.configSchema);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  const prevEntryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !selectedItem || !selectedPreset) {
      return;
    }

    const entryId = selectedItem.entry.meta.id;
    const entryChanged = prevEntryIdRef.current !== entryId;
    prevEntryIdRef.current = entryId;

    const defaults = buildPresetDefaults(selectedPreset);

    // When the module entry changes, restore persisted text if available.
    // When only the preset changes, always apply fresh preset defaults.
    const persistedSession = sessionRef.current;
    const nextConfigText = entryChanged
      ? (persistedSession.configTextByEntry[entryId] ?? defaults.configText)
      : defaults.configText;
    const nextConfig = parseJsonRecord(nextConfigText, defaults.config);

    const nextSharedText = entryChanged
      ? (persistedSession.sharedTextByEntry[entryId] ?? "{}")
      : "{}";
    const nextShared = parseJsonRecord(nextSharedText, {});

    const nextActionsText = entryChanged
      ? (persistedSession.actionsTextByEntry[entryId] ?? "[]")
      : "[]";
    const nextActions = parseActionDrafts(nextActionsText, []);

    setConfigText(nextConfigText);
    setConfigValue(nextConfig.value);
    setConfigError(nextConfig.error);
    setSharedText(nextSharedText);
    setSharedValue(nextShared.value);
    setSharedError(nextShared.error);
    setActionsText(nextActionsText);
    setActionsValue(nextActions.value);
    setActionsError(nextActions.error);
  }, [hydrated, selectedItem, selectedPreset]);

  useEffect(() => {
    if (!hydrated || !selectedItem) {
      if (!selectedItem) {
        setMockAdapter(null);
        setMockAdapterEntryId(null);
        setIsLoadingMockAdapter(false);
        setMockStateText("{}");
        setMockStateValue({});
        setMockStateError(null);
      }
      return;
    }

    if (!selectedItem.hasMockAdapter) {
      setMockAdapter(null);
      setMockAdapterEntryId(null);
      setIsLoadingMockAdapter(false);
      setMockStateText("{}");
      setMockStateValue({});
      setMockStateError(null);
      return;
    }

    let cancelled = false;
    const entryId = selectedItem.entry.meta.id;
    const basePath = selectedItem.entry.basePath;

    setIsLoadingMockAdapter(true);
    setMockAdapterEntryId(null);
    setMockAdapter(null);
    setMockStateText("{}");
    setMockStateValue({});
    setMockStateError(null);

    void (async () => {
      const loaded = await loadModuleDevMockAdapter(basePath);
      if (cancelled) return;

      setMockAdapter(loaded);
      setMockAdapterEntryId(loaded ? entryId : null);
      setIsLoadingMockAdapter(false);

      if (loaded) {
        const persisted = sessionRef.current.mockTextByEntry[entryId];
        const initialState = resolveModuleDevMockState(loaded);

        if (persisted) {
          const parsed = parseModuleDevMockStateText(
            persisted,
            loaded,
            initialState,
          );
          setMockStateText(
            parsed.error ? persisted : formatJson(parsed.value),
          );
          setMockStateValue(parsed.value);
          setMockStateError(parsed.error);
        } else {
          setMockStateText(formatJson(initialState));
          setMockStateValue(initialState);
          setMockStateError(null);
        }
      } else {
        setMockStateText("{}");
        setMockStateValue({});
        setMockStateError(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, selectedItem]);

  const previewSurface = "dashboard" as const;
  const previewAuth = { role: session.role };
  const mockLayer = useModuleDevMocks(mockAdapter, mockStateValue);
  const needsMockLayer = Boolean(selectedItem?.hasMockAdapter);
  const hasLoadedMockAdapterForSelection =
    !!selectedItem &&
    mockAdapterEntryId === selectedItem.entry.meta.id &&
    !!mockAdapter;
  const isMockLayerPending =
    needsMockLayer &&
    (isLoadingMockAdapter ||
      !hasLoadedMockAdapterForSelection ||
      !mockLayer.ready);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  function updateSessionForEntry(
    field:
      | "configTextByEntry"
      | "sharedTextByEntry"
      | "mockTextByEntry"
      | "actionsTextByEntry",
    value: string,
  ) {
    if (!selectedEntryId) {
      return;
    }

    setSession((previous) => ({
      ...previous,
      [field]: {
        ...previous[field],
        [selectedEntryId]: value,
      },
    }));
  }

  function handleConfigTextChange(nextText: string) {
    const parsed = parseJsonRecord(nextText, configValue);
    setConfigText(nextText);
    setConfigError(parsed.error);
    setConfigValue(parsed.value);
    updateSessionForEntry("configTextByEntry", nextText);
  }

  function handleSchemaFormChange(nextValue: Record<string, unknown>) {
    const nextText = formatJson(nextValue);
    setConfigText(nextText);
    setConfigValue(nextValue);
    setConfigError(null);
    updateSessionForEntry("configTextByEntry", nextText);
  }

  function handleSharedTextChange(nextText: string) {
    const parsed = parseJsonRecord(nextText, sharedValue);
    setSharedText(nextText);
    setSharedError(parsed.error);
    setSharedValue(parsed.value);
    updateSessionForEntry("sharedTextByEntry", nextText);
  }

  function handleMockStateTextChange(nextText: string) {
    const parsed = parseModuleDevMockStateText(nextText, mockAdapter, mockStateValue);
    setMockStateText(nextText);
    setMockStateError(parsed.error);
    setMockStateValue(parsed.value);
    updateSessionForEntry("mockTextByEntry", nextText);
  }

  function handleActionsTextChange(nextText: string) {
    const parsed = parseActionDrafts(nextText, actionsValue);
    setActionsText(nextText);
    setActionsError(parsed.error);
    setActionsValue(parsed.value);
    updateSessionForEntry("actionsTextByEntry", nextText);
  }

  function resetCurrentPreset() {
    if (!selectedEntryId || !selectedPreset) {
      return;
    }

    const defaults = buildPresetDefaults(selectedPreset);
    setConfigText(defaults.configText);
    setConfigValue(defaults.config);
    setConfigError(null);
    setSharedText("{}");
    setSharedValue({});
    setSharedError(null);
    setActionsText("[]");
    setActionsValue([]);
    setActionsError(null);

    if (mockAdapter) {
      const initialState = resolveModuleDevMockState(mockAdapter);
      setMockStateText(formatJson(initialState));
      setMockStateValue(initialState);
      setMockStateError(null);
    }

    setSession((previous) => ({
      ...previous,
      configTextByEntry: {
        ...previous.configTextByEntry,
        [selectedEntryId]: defaults.configText,
      },
      sharedTextByEntry: {
        ...previous.sharedTextByEntry,
        [selectedEntryId]: "{}",
      },
      mockTextByEntry: {
        ...previous.mockTextByEntry,
        [selectedEntryId]: mockAdapter
          ? formatJson(resolveModuleDevMockState(mockAdapter))
          : "{}",
      },
      actionsTextByEntry: {
        ...previous.actionsTextByEntry,
        [selectedEntryId]: "[]",
      },
    }));
  }

  async function generatePreview() {
    const node = canvasRef.current;
    if (!node || !selectedEntryId) return;

    setIsCapturing(true);
    try {
      const dataUrl = await toPng(node, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `preview-${selectedEntryId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(`Preview downloaded as preview-${selectedEntryId}.png`);
    } catch (error) {
      toast.error(
        `Could not generate preview: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsCapturing(false);
    }
  }

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(configText);
      toast.success("Config copied to clipboard.");
    } catch {
      toast.error("Could not copy config to clipboard.");
    }
  }

  if (isLoadingCatalog || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 w-full">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Dev Modules
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Loading module sandbox...
          </p>
        </div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 w-full">
        <div className="max-w-lg rounded-3xl border border-rose-500/20 bg-rose-500/8 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            Could not load dev modules
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{catalogError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-foreground w-full h-screen overflow-hidden",
        MODULE_DEV_SURFACE_STYLES[previewSurface],
      )}
    >
      <div className="flex h-full flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="shrink-0 rounded-[32px] border border-border/70 bg-background/86 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur lg:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Module Sandbox
                </h1>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Dev Modules
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCurrentPreset}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Reset preset
                </Button>
                <Button type="button" onClick={() => void copyConfig()}>
                  <Copy className="mr-2 size-4" />
                  Copy config
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCapturing}
                  onClick={() => void generatePreview()}
                >
                  {isCapturing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 size-4" />
                  )}
                  Generate preview
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <ControlField label="Search">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="spotify, lights, weather..."
                />
              </ControlField>

              <ControlField label="Module Entry">
                <select
                  className={SELECT_CLASS_NAME}
                  value={selectedEntryId ?? ""}
                  onChange={(event) =>
                    setSession((previous) => ({
                      ...previous,
                      selectedEntryId: event.target.value,
                      presetId: null,
                    }))
                  }
                >
                  {filteredCatalog.map((item) => (
                    <option key={item.entry.meta.id} value={item.entry.meta.id}>
                      {item.entry.meta.name}
                    </option>
                  ))}
                </select>
              </ControlField>

              <ControlField label="Preset">
                <select
                  className={SELECT_CLASS_NAME}
                  value={selectedPreset?.id ?? ""}
                  onChange={(event) =>
                    setSession((previous) => ({
                      ...previous,
                      presetId: event.target.value,
                    }))
                  }
                >
                  {(selectedItem?.presets ?? []).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </ControlField>

              <ControlField label="Theme">
                <select
                  className={SELECT_CLASS_NAME}
                  value={session.theme}
                  onChange={(event) =>
                    setSession((previous) => ({
                      ...previous,
                      theme:
                        event.target.value === "light" ||
                        event.target.value === "dark"
                          ? event.target.value
                          : "system",
                    }))
                  }
                >
                  <option value="system">system</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                </select>
              </ControlField>

              <ControlField label="Role">
                <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                  <select
                    className="w-full bg-transparent text-sm outline-none"
                    value={session.role}
                    onChange={(event) =>
                      setSession((previous) => ({
                        ...previous,
                        role: event.target.value === "user" ? "user" : "admin",
                      }))
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </div>
              </ControlField>
              <ControlField label="Remember settings">
                <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                  <input
                    id="persist-session"
                    type="checkbox"
                    checked={session.persist}
                    onChange={(event) =>
                      setSession((previous) => ({
                        ...previous,
                        persist: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="persist-session"
                    className="text-sm text-muted-foreground"
                  >
                    Persist configuration in local storage
                  </label>
                </div>
              </ControlField>
            </div>

            {selectedItem ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">
                  {selectedItem.entry.meta.size?.width ?? 2}x
                  {selectedItem.entry.meta.size?.height ?? 2}
                </Badge>
                <span>{selectedItem.entry.basePath}</span>
                {selectedItem.entry.meta.description ? (
                  <span>{selectedItem.entry.meta.description}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="flex items-center justify-center overflow-auto rounded-[32px] border border-border/70 bg-background/86 p-4 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur lg:p-5">
            {needsMockLayer &&
            hasLoadedMockAdapterForSelection &&
            mockLayer.error ? (
              <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[28px] border border-rose-500/20 bg-rose-500/8 px-6 text-center">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Mock layer failed
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {mockLayer.error}
                  </p>
                </div>
              </div>
            ) : isMockLayerPending ? (
              <div className="flex h-full min-h-[20rem] items-center justify-center rounded-[28px] border border-border/60 bg-background/70 px-6 text-center">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Starting local mocks
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Waiting for MSW before mounting networked modules.
                  </p>
                </div>
              </div>
            ) : selectedItem && selectedPreset ? (
              <ModuleDevRuntime
                ref={canvasRef}
                actions={actionsValue}
                authState={previewAuth}
                canvasMode="actual"
                config={configValue}
                entryId={selectedItem.entry.meta.id}
                sharedData={sharedValue}
                surface={previewSurface}
              />
            ) : null}
          </section>

          <aside className="overflow-y-auto rounded-[32px] border border-border/70 bg-background/92 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="flex flex-col">
              <div className="border-b border-border/70 px-5 py-4">
                <p className="text-sm font-semibold">Sandbox Controls</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Edit config and preview settings live.
                </p>
              </div>

              <div className="px-5 py-5">
                <div className="space-y-6">
                  <section className="space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold">Config</h2>
                      <p className="text-xs text-muted-foreground">
                        Generated form when the module exports a Zod object.
                      </p>
                    </div>
                    <SchemaForm
                      schema={configSchema}
                      value={configValue}
                      onChange={handleSchemaFormChange}
                    />
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setConfigJsonOpen((prev) => !prev)}
                    >
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform",
                          configJsonOpen && "rotate-180",
                        )}
                      />
                      Config JSON
                    </button>
                    {configJsonOpen ? (
                      <>
                        <Textarea
                          id="config-json"
                          className="min-h-44 font-mono text-xs"
                          value={configText}
                          onChange={(event) =>
                            handleConfigTextChange(event.target.value)
                          }
                        />
                        {configError ? (
                          <p className="text-xs text-amber-600">
                            {configError}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </section>

                  {mockAdapter ? (
                    <>
                      <Separator />
                      <section className="space-y-3">
                        <div>
                          <h2 className="text-sm font-semibold">Mock State</h2>
                          <p className="text-xs text-muted-foreground">
                            Module-local mock adapter state. Changes re-apply
                            the adapter automatically.
                          </p>
                        </div>
                        <Textarea
                          className="min-h-40 font-mono text-xs"
                          value={mockStateText}
                          onChange={(event) =>
                            handleMockStateTextChange(event.target.value)
                          }
                        />
                        {mockStateError ? (
                          <p className="text-xs text-amber-600">
                            {mockStateError}
                          </p>
                        ) : null}
                      </section>
                    </>
                  ) : null}

                  <Separator />

                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                    onClick={() => setAdvancedOpen((prev) => !prev)}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        advancedOpen && "rotate-180",
                      )}
                    />
                    Advanced
                  </button>

                  {advancedOpen ? (
                    <div className="space-y-6">
                      <section className="space-y-3">
                        <div>
                          <h2 className="text-sm font-semibold">Shared Data</h2>
                          <p className="text-xs text-muted-foreground">
                            Seeds for `SharedContextProvider`.
                          </p>
                        </div>
                        <Textarea
                          className="min-h-36 font-mono text-xs"
                          value={sharedText}
                          onChange={(event) =>
                            handleSharedTextChange(event.target.value)
                          }
                        />
                        {sharedError ? (
                          <p className="text-xs text-amber-600">
                            {sharedError}
                          </p>
                        ) : null}
                      </section>

                      <Separator />

                      <section className="space-y-3">
                        <div>
                          <h2 className="text-sm font-semibold">Actions</h2>
                          <p className="text-xs text-muted-foreground">
                            JSON array of draft actions. Each draft becomes a
                            callable `run()` action inside the sandbox.
                          </p>
                        </div>
                        <Textarea
                          className="min-h-40 font-mono text-xs"
                          value={actionsText}
                          onChange={(event) =>
                            handleActionsTextChange(event.target.value)
                          }
                        />
                        {actionsError ? (
                          <p className="text-xs text-amber-600">
                            {actionsError}
                          </p>
                        ) : null}
                      </section>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
