import { z } from "zod";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { loadModuleDefinition, loadModulesIndex } from "../loader";
import { getCandidatePlacement } from "../grid-layout";
import type { ModuleMeta, Page } from "../types";
import { WidgetConfigForm } from "../config/WidgetConfigForm";
import { WidgetConfigPreview } from "../config/WidgetConfigPreview";
import { buildInitialConfig, validateConfigDraft } from "../config/schema";

function formatSizeLabel(width: number, height: number) {
  return `${width}x${height}`;
}

type SchemaState =
  | { status: "loading"; schema: null }
  | { status: "ready"; schema: z.ZodTypeAny | null };

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
  const [schemaState, setSchemaState] = useState<SchemaState>({
    status: "loading",
    schema: null,
  });
  const [pageId, setPageId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Record<string, unknown>>(initialConfig ?? {});
  const [newPageName, setNewPageName] = useState("");
  const [createPageError, setCreatePageError] = useState<string | null>(null);
  const [isCreatingPage, setIsCreatingPage] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setSchemaState({ status: "loading", schema: null });

    void (async () => {
      const index = await loadModulesIndex();
      const entry = index.find((item) => item.meta.id === meta.id);
      if (!entry) {
        if (!cancelled) {
          setSchemaState({ status: "ready", schema: null });
        }
        return;
      }

      const definition = await loadModuleDefinition(entry);
      if (!cancelled) {
        setSchemaState({
          status: "ready",
          schema: (definition.configSchema as z.ZodTypeAny) ?? null,
        });
      }
    })().catch(() => {
      if (!cancelled) {
        setSchemaState({ status: "ready", schema: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [meta.id]);

  const initialConfigMemo = useMemo(
    () => initialConfig ?? ({} as Record<string, unknown>),
    [initialConfig],
  );

  useEffect(() => {
    if (open) {
      setPageId(currentPageId);
      setNewPageName("");
      setCreatePageError(null);
    }
  }, [currentPageId, open]);

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialConfig(schemaState.schema, meta, initialConfigMemo));
  }, [initialConfigMemo, meta, open, schemaState.schema]);

  const validation = useMemo(
    () => validateConfigDraft(schemaState.schema, form),
    [form, schemaState.schema],
  );

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

  const canSaveToSelectedPage =
    mode === "edit" || Boolean(selectedPageOption?.placement.position);
  const canSave = canSaveToSelectedPage && validation.isValid;

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
    if (!validation.isValid) {
      return;
    }

    void onSave(
      validation.parsed ?? form,
      mode === "add" ? pageId ?? currentPageId : undefined,
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[1120px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit" : "Configure"}: {meta.name}
          </DialogTitle>
          <DialogDescription>
            Adjust the widget settings and preview the result before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
          <div className="space-y-5">
            {schemaState.status === "loading" ? (
              <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                Loading settings...
              </p>
            ) : schemaState.schema ? (
              <WidgetConfigForm
                schema={schemaState.schema}
                meta={meta}
                value={form}
                validation={validation}
                onChange={setForm}
              />
            ) : (
              <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                This widget does not require configuration.
              </p>
            )}

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
                        This widget fits in{" "}
                        <strong>{selectedPageOption.page.name}</strong>.
                        Prometeo will place it automatically in the first free
                        slot.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p>
                          <strong>{selectedPageOption.page.name}</strong> no
                          longer has space for a{" "}
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
                              onChange={(event) =>
                                setNewPageName(event.target.value)
                              }
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
                            <p className="text-sm text-destructive">
                              {createPageError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <WidgetConfigPreview meta={meta} value={form} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {mode === "edit" ? "Save" : "Add widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
