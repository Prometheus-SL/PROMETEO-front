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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { loadModulesIndex, loadModuleDefinition } from "../loader";
import { getCandidatePlacement } from "../grid-layout";
import type { ModuleMeta, Page } from "../types";

function ZodForm({
  schema,
  initial,
  onChange,
}: {
  schema: z.ZodTypeAny;
  initial: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape as Record<
    string,
    z.ZodTypeAny
  >;

  function unwrap(field: z.ZodTypeAny): z.ZodTypeAny {
    let current: z.ZodTypeAny = field;
    for (let index = 0; index < 10; index += 1) {
      if (current instanceof z.ZodDefault) {
        const definition = (Reflect.get(current, "_def") as unknown) ?? undefined;
        const inner =
          definition && typeof definition === "object"
            ? (Reflect.get(definition as object, "innerType") as
                | z.ZodTypeAny
                | undefined)
            : undefined;
        if (!inner) break;
        current = inner;
        continue;
      }

      if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
        const definition = (Reflect.get(current, "_def") as unknown) ?? undefined;
        const inner =
          definition && typeof definition === "object"
            ? (Reflect.get(definition as object, "innerType") as
                | z.ZodTypeAny
                | undefined)
            : undefined;
        if (!inner) break;
        current = inner;
        continue;
      }

      if (current instanceof z.ZodAny) {
        const definition = (Reflect.get(current, "_def") as unknown) ?? undefined;
        const inner =
          definition && typeof definition === "object"
            ? (Reflect.get(definition as object, "schema") as
                | z.ZodTypeAny
                | undefined)
            : undefined;
        if (!inner) break;
        current = inner;
        continue;
      }

      break;
    }

    return current;
  }

  const defaults = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(shape)) {
      const parsed = field.safeParse(undefined);
      if (parsed.success && parsed.data !== undefined) {
        result[key] = parsed.data as unknown;
        continue;
      }

      const base = unwrap(field);
      if (base instanceof z.ZodString) result[key] = "";
      else if (base instanceof z.ZodNumber) result[key] = 0;
      else if (base instanceof z.ZodEnum) result[key] = base.options?.[0] ?? "";
      else if (base instanceof z.ZodBoolean) result[key] = false;
    }

    return result;
  }, [shape]);

  const [values, setValues] = useState<Record<string, unknown>>({
    ...defaults,
    ...initial,
  });

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
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
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
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [key]: Number(event.target.value),
                  }))
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
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={(values[key] as string) ?? options[0] ?? ""}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
                  setValues((previous) => ({
                    ...previous,
                    [key]: Boolean(checked),
                  }))
                }
              />
              <Label htmlFor={key}>{key}</Label>
            </div>
          );
        }

        return (
          <div key={key} className="text-xs text-zinc-500">
            Unsupported field in the demo: {key}
          </div>
        );
      })}
    </div>
  );
}

function formatSizeLabel(width: number, height: number) {
  return `${width}x${height}`;
}

export function ModuleConfigModal({
  meta,
  open,
  onClose,
  onSave,
  mode = "add",
  initialConfig,
  pages = [],
  currentPageId,
  onCreatePage,
}: {
  meta: ModuleMeta;
  open: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>, pageId?: string) => void | Promise<void>;
  mode?: "add" | "edit";
  initialConfig?: Record<string, unknown>;
  pages?: Page[];
  currentPageId?: string;
  onCreatePage?: (name: string) => Promise<Page>;
}) {
  const [schema, setSchema] = useState<z.ZodTypeAny | null>(null);
  const [pageId, setPageId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Record<string, unknown>>(initialConfig ?? {});
  const [newPageName, setNewPageName] = useState("");
  const [createPageError, setCreatePageError] = useState<string | null>(null);
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const index = await loadModulesIndex();
      const entry = index.find((item) => item.meta.id === meta.id);
      if (!entry) return;

      const definition = await loadModuleDefinition(entry);
      if (!cancelled) {
        setSchema((definition.configSchema as z.ZodTypeAny) ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meta.id]);

  useEffect(() => {
    if (open) {
      setPageId(currentPageId);
      setNewPageName("");
      setCreatePageError(null);
    }
  }, [currentPageId, open]);

  const initialConfigMemo = useMemo(
    () => initialConfig ?? ({} as Record<string, unknown>),
    [initialConfig],
  );

  useEffect(() => {
    setForm(initialConfigMemo);
  }, [initialConfigMemo]);

  const pageOptions = useMemo(() => {
    return pages.map((page) => {
      const placement = getCandidatePlacement(page.modules, meta, form);
      return {
        page,
        placement,
      };
    });
  }, [form, meta, pages]);

  const selectedPageOption = useMemo(
    () => pageOptions.find((option) => option.page._id === pageId) ?? null,
    [pageId, pageOptions],
  );

  const content = useMemo(() => {
    if (!schema) {
      return <div>This module does not require configuration.</div>;
    }

    return (
      <ZodForm schema={schema} initial={initialConfigMemo} onChange={setForm} />
    );
  }, [initialConfigMemo, schema]);

  const canSaveToSelectedPage =
    mode === "edit" || Boolean(selectedPageOption?.placement.position);

  async function handleCreatePage() {
    const name = newPageName.trim();
    if (!onCreatePage) {
      return;
    }

    if (!name) {
      setCreatePageError("Write a name before creating the new page");
      return;
    }

    setCreatePageError(null);
    setIsCreatingPage(true);

    try {
      const createdPage = await onCreatePage(name);
      setPageId(createdPage._id);
      setNewPageName("");
    } catch (error) {
      setCreatePageError(
        (error as Error)?.message || "Could not create the new page",
      );
    } finally {
      setIsCreatingPage(false);
    }
  }

  function handleSave() {
    if (!schema) {
      void onSave(form, pageId ?? currentPageId);
      return;
    }

    const parsed = schema.safeParse(form);
    void onSave(
      parsed.success ? (parsed.data as Record<string, unknown>) : form,
      pageId ?? currentPageId,
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit" : "Configure"}: {meta.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {content}

          {mode === "add" && pages.length > 0 ? (
            <div className="space-y-3">
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="page-select">Add to Page</Label>
                <Select
                  name="page-select"
                  value={pageId ?? currentPageId ?? ""}
                  onValueChange={setPageId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select page" className="w-full" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {pageOptions.map(({ page, placement }) => (
                      <SelectItem key={page._id} value={page._id}>
                        {page.name}
                        {placement.position
                          ? ` - Fits ${formatSizeLabel(placement.size.w, placement.size.h)}`
                          : " - Full"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPageOption ? (
                <div
                  className={
                    selectedPageOption.placement.position
                      ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300"
                      : "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-800 dark:text-amber-200"
                  }
                >
                  {selectedPageOption.placement.position ? (
                    <p>
                      This widget fits in <strong>{selectedPageOption.page.name}</strong>.
                      Prometeo will place it automatically in the first free slot.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p>
                        <strong>{selectedPageOption.page.name}</strong> no longer has
                        space for a{" "}
                        {formatSizeLabel(
                          selectedPageOption.placement.size.w,
                          selectedPageOption.placement.size.h,
                        )}{" "}
                        widget. Choose another page or create a new one below.
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="new-page-name">Create another page</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            id="new-page-name"
                            value={newPageName}
                            onChange={(event) => setNewPageName(event.target.value)}
                            placeholder="New dashboard name"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void handleCreatePage()}
                            disabled={isCreatingPage}
                          >
                            {isCreatingPage ? "Creating..." : "Create and use it"}
                          </Button>
                        </div>
                        {createPageError ? (
                          <p className="text-sm text-destructive">{createPageError}</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSaveToSelectedPage}>
            {mode === "edit" ? "Save" : "Add widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
