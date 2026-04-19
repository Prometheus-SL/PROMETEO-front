import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
import type {
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
            {advanced.map((field) => (
              <FieldShell
                key={field.key}
                field={field}
                error={validation.errorsByKey[field.key]}
              >
                <FieldControl field={field} value={value} onChange={onChange} />
              </FieldShell>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
