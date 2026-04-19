import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Keyboard,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { ModuleMeta } from "../types";
import {
  resolveConfigFields,
  toConfigValue,
  toDisplayValue,
} from "./schema";
import { loadDynamicOptions } from "./dynamic-options";
import type {
  ModuleConfigOption,
  ModuleConfigValidation,
  ResolvedModuleConfigField,
} from "./types";

type WidgetConfigFormProps = {
  schema: z.ZodTypeAny;
  meta: ModuleMeta;
  value: Record<string, unknown>;
  validation: ModuleConfigValidation;
  onChange: (nextValue: Record<string, unknown>) => void;
};

function numberDisplayBound(
  field: ResolvedModuleConfigField,
  value: number | undefined,
) {
  if (value === undefined) return undefined;
  const display = toDisplayValue(field, value);
  return typeof display === "number" ? display : undefined;
}

function formatUnit(field: ResolvedModuleConfigField) {
  if (field.displayUnit === "seconds" || field.unit === "seconds") return "sec";
  if (field.displayUnit === "minutes") return "min";
  if (field.unit === "items") return "items";
  if (field.unit === "count") return "count";
  return null;
}

function optionText(option: ModuleConfigOption) {
  return option.badge ? `${option.label} (${option.badge})` : option.label;
}

function AsyncSelectControl({
  current,
  field,
  inputId,
  value,
  onChange,
}: {
  current: unknown;
  field: ResolvedModuleConfigField;
  inputId: string;
  value: Record<string, unknown>;
  onChange: (nextValue: unknown) => void;
}) {
  const [manual, setManual] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<{
    status: "idle" | "loading" | "blocked" | "ready" | "error";
    options: ModuleConfigOption[];
    missingDependencies: string[];
    error?: string;
  }>({
    status: "idle",
    options: [],
    missingDependencies: [],
  });
  const dynamicOptions = field.dynamicOptions;
  const valueRef = useRef(value);
  const dependencySignature = useMemo(() => {
    if (!dynamicOptions) return "";
    return JSON.stringify([
      dynamicOptions.source,
      (dynamicOptions.dependsOn ?? []).map((key) => [key, value[key] ?? ""]),
    ]);
  }, [dynamicOptions, value]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!dynamicOptions || manual) return;

    const controller = new AbortController();
    setState((previous) => ({
      status: "loading",
      options: previous.options,
      missingDependencies: [],
    }));

    void loadDynamicOptions(dynamicOptions, valueRef.current, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result.status === "blocked") {
          setState({
            status: "blocked",
            options: [],
            missingDependencies: result.missingDependencies,
          });
          return;
        }

        setState({
          status: "ready",
          options: result.options,
          missingDependencies: [],
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          options: [],
          missingDependencies: [],
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return () => controller.abort();
  }, [dependencySignature, dynamicOptions, manual, reloadKey]);

  if (!dynamicOptions || manual) {
    return (
      <div className="space-y-2">
        <Input
          id={inputId}
          value={String(current ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {dynamicOptions ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setManual(false)}
          >
            Use discovered options
          </Button>
        ) : null}
      </div>
    );
  }

  const currentValue = String(current ?? "");
  const selected = state.options.find((option) => option.value === currentValue);
  const currentIsUnknown =
    currentValue.length > 0 && state.options.every((option) => option.value !== currentValue);
  const blockedMessage =
    dynamicOptions.blockedText ??
    `Complete ${state.missingDependencies.join(", ")} first.`;
  const statusMessage = (() => {
    if (state.status === "loading") {
      return dynamicOptions.loadingText ?? "Loading options...";
    }
    if (state.status === "blocked") return blockedMessage;
    if (state.status === "error") {
      return dynamicOptions.errorText ?? state.error ?? "Could not load options.";
    }
    if (state.status === "ready" && state.options.length === 0) {
      return dynamicOptions.emptyText ?? "No options found.";
    }
    return selected?.description ?? null;
  })();

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          id={inputId}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          value={currentValue}
          disabled={state.status === "loading" || state.status === "blocked"}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">
            {state.status === "loading"
              ? dynamicOptions.loadingText ?? "Loading options..."
              : dynamicOptions.placeholder ?? field.placeholder ?? "Select an option"}
          </option>
          {currentIsUnknown ? (
            <option value={currentValue}>Current value ({currentValue})</option>
          ) : null}
          {state.options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {optionText(option)}
            </option>
          ))}
        </select>
        {state.status === "loading" ? (
          <div className="grid size-10 shrink-0 place-items-center rounded-md border border-border/70 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Reload options"
            onClick={() => setReloadKey((previous) => previous + 1)}
          >
            <RefreshCcw className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex min-h-7 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {selected?.badge ? (
          <Badge variant="outline" className="border-border/70">
            {selected.badge}
          </Badge>
        ) : null}
        {statusMessage ? <span>{statusMessage}</span> : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 text-xs"
          onClick={() => setManual(true)}
        >
          <Keyboard className="size-3.5" />
          {dynamicOptions.manualText ?? "Enter manually"}
        </Button>
      </div>
    </div>
  );
}

function FieldShell({
  children,
  error,
  field,
}: {
  children: ReactNode;
  error?: string;
  field: ResolvedModuleConfigField;
}) {
  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <Label htmlFor={`config-${field.key}`} className="min-w-0">
          {field.label}
        </Label>
        {field.required ? (
          <Badge variant="outline" className="border-primary/30 text-primary">
            Required
          </Badge>
        ) : null}
      </div>
      {children}
      {field.helpText ? (
        <p className="text-xs leading-5 text-muted-foreground">{field.helpText}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ResolvedModuleConfigField;
  value: Record<string, unknown>;
  onChange: (nextValue: Record<string, unknown>) => void;
}) {
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});

  function setFieldValue(nextValue: unknown) {
    onChange({
      ...value,
      [field.key]: toConfigValue(field, nextValue),
    });
  }

  const current = value[field.key];
  const displayValue = toDisplayValue(field, current);
  const inputId = `config-${field.key}`;

  if (field.input === "switch") {
    return (
      <div className="flex h-10 items-center justify-between rounded-md border border-border/70 px-3">
        <span className="text-sm text-muted-foreground">
          {current ? "Enabled" : "Disabled"}
        </span>
        <Switch
          id={inputId}
          checked={Boolean(current)}
          onCheckedChange={(checked) => setFieldValue(checked)}
        />
      </div>
    );
  }

  if (field.input === "segmented") {
    return (
      <div
        id={inputId}
        className="grid gap-1 rounded-md border border-border/70 bg-muted/40 p-1"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, field.options?.length ?? 1)}, minmax(0, 1fr))`,
        }}
      >
        {(field.options ?? []).map((option) => {
          const active = String(current) === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? "default" : "ghost"}
              size="sm"
              className="h-8 px-2 text-xs"
              aria-pressed={active}
              onClick={() => setFieldValue(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    );
  }

  if (field.input === "select") {
    return (
      <select
        id={inputId}
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        value={String(current ?? field.options?.[0]?.value ?? "")}
        onChange={(event) => setFieldValue(event.target.value)}
      >
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.input === "async-select") {
    return (
      <AsyncSelectControl
        current={current}
        field={field}
        inputId={inputId}
        value={value}
        onChange={setFieldValue}
      />
    );
  }

  if (field.input === "color") {
    return (
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="color"
          className="h-10 w-14 shrink-0 p-1"
          value={String(current ?? "#facc15")}
          onChange={(event) => setFieldValue(event.target.value)}
        />
        <Input
          value={String(current ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => setFieldValue(event.target.value)}
        />
      </div>
    );
  }

  if (field.input === "slider") {
    const min = numberDisplayBound(field, field.min) ?? 0;
    const max = numberDisplayBound(field, field.max) ?? Math.max(min + 1, 100);
    const step = numberDisplayBound(field, field.step) ?? 1;
    const numericDisplay =
      typeof displayValue === "number" && Number.isFinite(displayValue)
        ? displayValue
        : min;
    const unit = formatUnit(field);

    return (
      <div className="space-y-3 rounded-md border border-border/70 p-3">
        <Slider
          id={inputId}
          min={min}
          max={max}
          step={step}
          value={[numericDisplay]}
          onValueChange={([nextValue]) => setFieldValue(nextValue)}
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={String(displayValue ?? "")}
            min={min}
            max={max}
            step={step}
            onChange={(event) => setFieldValue(event.target.value)}
          />
          {unit ? (
            <span className="w-12 shrink-0 text-xs text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.input === "number") {
    const unit = formatUnit(field);
    return (
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          type="number"
          value={String(displayValue ?? "")}
          min={numberDisplayBound(field, field.min)}
          max={numberDisplayBound(field, field.max)}
          step={numberDisplayBound(field, field.step)}
          onChange={(event) => setFieldValue(event.target.value)}
        />
        {unit ? (
          <span className="w-12 shrink-0 text-xs text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </div>
    );
  }

  if (field.input === "json") {
    const currentText =
      jsonDrafts[field.key] ?? JSON.stringify(current ?? null, null, 2);

    return (
      <Textarea
        id={inputId}
        value={currentText}
        className="min-h-28 font-mono text-xs"
        onChange={(event) => {
          const text = event.target.value;
          setJsonDrafts((previous) => ({ ...previous, [field.key]: text }));
          try {
            onChange({
              ...value,
              [field.key]: JSON.parse(text),
            });
          } catch {
            // Keep the draft visible; schema validation will block saving.
          }
        }}
      />
    );
  }

  if (field.input === "secret") {
    const visible = Boolean(visibleSecrets[field.key]);
    return (
      <div className="flex gap-2">
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          value={String(current ?? "")}
          placeholder={field.placeholder}
          onChange={(event) => setFieldValue(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={visible ? "Hide secret" : "Show secret"}
          onClick={() =>
            setVisibleSecrets((previous) => ({
              ...previous,
              [field.key]: !previous[field.key],
            }))
          }
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
    );
  }

  return (
    <Input
      id={inputId}
      value={String(current ?? "")}
      placeholder={field.placeholder}
      onChange={(event) => setFieldValue(event.target.value)}
    />
  );
}

export function WidgetConfigForm({
  schema,
  meta,
  value,
  validation,
  onChange,
}: WidgetConfigFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fields = useMemo(
    () => resolveConfigFields({ schema, meta, value }),
    [schema, meta, value],
  );
  const essential = fields.filter((field) => field.section === "essential");
  const advanced = fields.filter((field) => field.section === "advanced");
  const advancedHasErrors = advanced.some(
    (field) => validation.errorsByKey[field.key],
  );
  const visibleAdvanced = showAdvanced || advancedHasErrors;

  if (!fields.length) {
    return (
      <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
        This widget does not require configuration.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {essential.map((field) => (
          <FieldShell
            key={field.key}
            field={field}
            error={validation.errorsByKey[field.key]}
          >
            <FieldControl field={field} value={value} onChange={onChange} />
          </FieldShell>
        ))}
      </div>

      {advanced.length > 0 ? (
        <div className="rounded-md border border-border/70">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-medium"
            onClick={() => setShowAdvanced((previous) => !previous)}
          >
            <span className="flex items-center gap-2">
              {visibleAdvanced ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              Advanced
            </span>
            {advancedHasErrors ? (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Needs attention
              </Badge>
            ) : null}
          </button>

          <div
            className={cn(
              "space-y-4 border-t border-border/70 p-3",
              visibleAdvanced ? "block" : "hidden",
            )}
          >
            {visibleAdvanced
              ? advanced.map((field) => (
                  <FieldShell
                    key={field.key}
                    field={field}
                    error={validation.errorsByKey[field.key]}
                  >
                    <FieldControl field={field} value={value} onChange={onChange} />
                  </FieldShell>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
