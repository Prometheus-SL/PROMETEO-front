import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { ModuleMeta } from "../types";
import { useMarketplaceStore } from "../store";
import { loadModulesIndex, loadModuleDefinition } from "../loader";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Generador de formulario mínimo a partir de un schema Zod (strings y numbers)
function ZodForm({
  schema,
  initial,
  onChange,
}: {
  schema: z.ZodTypeAny;
  initial: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape as Record<
    string,
    z.ZodTypeAny
  >;

  // Desenvuelve tipos para llegar al tipo base (maneja default/optional/nullable/effects)
  function unwrap(field: z.ZodTypeAny): z.ZodTypeAny {
    let cur: z.ZodTypeAny = field;
    for (let i = 0; i < 10; i++) {
      if (cur instanceof z.ZodDefault) {
        const def: unknown = (Reflect.get(cur, "_def") as unknown) ?? undefined;
        const inner =
          def && typeof def === "object"
            ? (Reflect.get(def as object, "innerType") as
                | z.ZodTypeAny
                | undefined)
            : undefined;
        if (!inner) break;
        cur = inner;
        continue;
      }
      if (cur instanceof z.ZodOptional || cur instanceof z.ZodNullable) {
        const def: unknown = (Reflect.get(cur, "_def") as unknown) ?? undefined;
        const inner =
          def && typeof def === "object"
            ? (Reflect.get(def as object, "innerType") as
                | z.ZodTypeAny
                | undefined)
            : undefined;
        if (!inner) break;
        cur = inner;
        continue;
      }
      if (cur instanceof z.ZodAny) {
        const def: unknown = (Reflect.get(cur, "_def") as unknown) ?? undefined;
        const inner =
          def && typeof def === "object"
            ? (Reflect.get(def as object, "schema") as z.ZodTypeAny | undefined)
            : undefined;
        if (!inner) break;
        cur = inner;
        continue;
      }
      break;
    }
    return cur;
  }

  const defaults = useMemo(() => {
    const d: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(shape)) {
      // Intenta obtener el valor por defecto desde el propio schema
      const parsed = field.safeParse(undefined);
      if (parsed.success && parsed.data !== undefined) {
        d[key] = parsed.data as unknown;
        continue;
      }
      const base = unwrap(field);
      if (base instanceof z.ZodString) d[key] = "";
      else if (base instanceof z.ZodNumber) d[key] = 0;
      else if (base instanceof z.ZodEnum)
        d[key] = (base.options?.[0] as string | undefined) ?? "";
      else if (base instanceof z.ZodBoolean) d[key] = false;
    }
    return d;
  }, [shape]);

  const [values, setValues] = useState<Record<string, unknown>>({
    ...defaults,
    ...initial,
  });

  // Si cambia el schema o initial, recalculamos valores
  useEffect(() => {
    setValues({ ...defaults, ...initial });
  }, [defaults, initial]);

  useEffect(() => onChange(values), [values, onChange]);

  return (
    <div className="space-y-4">
      {Object.entries(shape).map(([key, field]) => {
        const base = unwrap(field);

        if (base instanceof z.ZodString) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{key}</Label>
              <Input
                id={key}
                value={(values[key] as string) ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
              />
            </div>
          );
        }
        if (base instanceof z.ZodNumber) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{key}</Label>
              <Input
                id={key}
                type="number"
                value={(values[key] as number | undefined) ?? 0}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: Number(e.target.value) }))
                }
              />
            </div>
          );
        }
        if (base instanceof z.ZodEnum) {
          const options = base.options as string[];
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{key}</Label>
              <select
                id={key}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={(values[key] as string) ?? options[0] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (base instanceof z.ZodBoolean) {
          return (
            <div key={key} className="flex items-center gap-2 py-2">
              <Checkbox
                id={key}
                checked={Boolean(values[key])}
                onCheckedChange={(checked) =>
                  setValues((v) => ({ ...v, [key]: Boolean(checked) }))
                }
              />
              <Label htmlFor={key}>{key}</Label>
            </div>
          );
        }
        return (
          <div key={key} className="text-xs text-zinc-500">
            Campo no soportado en el demo: {key}
          </div>
        );
      })}
    </div>
  );
}

export function ModuleConfigModal({
  meta,
  open,
  onClose,
  onSave,
  mode = "add",
  initialConfig,
}: {
  meta: ModuleMeta;
  open: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>, pageId?: string) => void;
  mode?: "add" | "edit";
  initialConfig?: Record<string, unknown>;
}) {
  const [schema, setSchema] = useState<z.ZodTypeAny | null>(null);
  const [pageId, setPageId] = useState<string | undefined>(undefined);
  const { state } = useMarketplaceStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const index = await loadModulesIndex();
      const entry = index.find((e) => e.meta.id === meta.id);
      if (!entry) return;
      const def = await loadModuleDefinition(entry);
      if (cancelled) return;
      setSchema((def.configSchema as z.ZodTypeAny) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.id]);

  // Inicializa el pageId por defecto a la página actual cuando se abre o cambia la actual
  useEffect(() => {
    if (open) setPageId(state.currentPageId);
  }, [open, state.currentPageId]);

  // Estabiliza initialConfig para evitar recreaciones por identidad
  const initialConfigMemo = useMemo(
    () => initialConfig ?? ({} as Record<string, unknown>),
    [initialConfig]
  );

  const [form, setForm] = useState<Record<string, unknown>>(initialConfigMemo);
  useEffect(() => {
    // Cuando cambie initialConfig (p.ej. al abrir edición), sincroniza el formulario
    setForm(initialConfigMemo);
  }, [initialConfigMemo]);

  const content = useMemo(() => {
    if (!schema) return <div>This module does not require configuration.</div>;
    return (
      <ZodForm schema={schema} initial={initialConfigMemo} onChange={setForm} />
    );
  }, [schema, initialConfigMemo]);

  const handleSave = () => {
    if (!schema) {
      onSave(form, pageId ?? state.currentPageId);
      return;
    }

    const parsed = schema.safeParse(form);
    onSave(
      parsed.success ? (parsed.data as Record<string, unknown>) : form,
      pageId ?? state.currentPageId
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar" : "Configure"}: {meta.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          {/* Config del módulo */}
          {content}
          {/* Selección de página destino */}
          {mode === "add" && state.pages?.length ? (
            <div className="space-y-3 w-full">
              <Separator />
              <Label htmlFor="page-select">Add to Page</Label>
              <Select
                name="page-select"
                value={pageId ?? state.currentPageId ?? ""}
                onValueChange={setPageId}
              >
                <SelectTrigger className="w-full ">
                  <SelectValue placeholder="Select page" className="w-full" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {state.pages.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {mode === "edit" ? "Guardar" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
