import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Star,
  Trash2,
  FileText,
  History,
  Save,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getDashboardEditorStats,
  reorderDashboardPageIds,
  sortDashboardPages,
} from "@/modules/dashboard-pages";
import { GRID_COLS, GRID_ROWS } from "@/modules/grid-layout";
import { useMarketplaceStore } from "@/modules/store";
import type { InstalledModule, Page } from "@/modules/types";
import { GridManager } from "@/modules/ui/GridManager";
import {
  dashboardService,
  type DashboardTemplate,
  type DashboardVersion,
} from "@/services/dashboards";

export default function DashboardsPage() {
  const store = useMarketplaceStore();
  const {
    state,
    selectDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    setDashboardVisibility,
    setPrincipalDashboard,
    reorderDashboardPages,
    removeModule,
    setModulePosition,
    setModuleConfig,
    repairDashboardLayout,
    refreshDashboards,
  } = store;

  const pages = useMemo(
    () => sortDashboardPages(state.pages ?? []),
    [state.pages],
  );
  const currentIndex = useMemo(() => {
    if (!pages.length) return 0;
    const idx = pages.findIndex((p) => p._id === state.currentPageId);
    return idx >= 0 ? idx : 0;
  }, [pages, state.currentPageId]);

  const currentPage = pages.find((p) => p._id === state.currentPageId) ?? null;
  const dashboardStats = useMemo(
    () => getDashboardEditorStats(currentPage),
    [currentPage],
  );
  const visiblePageCount = pages.filter((page) => page.active).length;
  const principalPage = pages.find((page) => page.principal) ?? null;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState({
    name: "",
    slug: "",
    description: "",
    makeActive: pages.length === 0,
    makePrincipal: pages.length === 0,
  });

  function GridPreview({
    modules,
    filledClass,
  }: {
    modules?: InstalledModule[];
    filledClass?: string;
  }) {
    const cells = Array.from({ length: GRID_COLS * GRID_ROWS }).map(
      () => false,
    );
    (modules || []).forEach((mod) => {
      const pos = mod.position;
      if (!pos) return;
      for (let y = pos.y; y < pos.y + pos.h; y += 1) {
        for (let x = pos.x; x < pos.x + pos.w; x += 1) {
          const idx = y * GRID_COLS + x;
          if (idx >= 0 && idx < cells.length) cells[idx] = true;
        }
      }
    });

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          gap: 2,
          width: "100%",
          height: "100%",
        }}
      >
        {cells.map((filled, i) => (
          <div
            key={i}
            className={cn(
              "rounded-sm border",
              filled ? (filledClass ?? "bg-primary/80") : "bg-muted/10",
            )}
          />
        ))}
      </div>
    );
  }
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);

  // Templates
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateCreatingId, setTemplateCreatingId] = useState<string | null>(
    null,
  );

  // Versions
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<DashboardVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(
    null,
  );

  const resetFormState = (page?: Page) => {
    if (page) {
      setFormState({
        name: page.name,
        slug: page.slug ?? "",
        description: page.description ?? "",
        makeActive: page.active,
        makePrincipal: Boolean(page.principal),
      });
    } else {
      setFormState({
        name: "",
        slug: "",
        description: "",
        makeActive: pages.length === 0,
        makePrincipal: pages.length === 0,
      });
    }
  };

  const openCreateDialog = () => {
    setDialogMode("create");
    resetFormState();
    setFormError(null);
    setEditingPageId(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (page: Page) => {
    setDialogMode("edit");
    resetFormState(page);
    setFormError(null);
    setEditingPageId(page._id);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPageId(null);
    setFormError(null);
  };

  const handleDialogSubmit = async () => {
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError("Name is required");
      return;
    }

    const payload = {
      name: trimmedName,
      slug: formState.slug.trim() || undefined,
      description: formState.description.trim() || undefined,
      active: formState.makePrincipal ? true : formState.makeActive,
      principal: formState.makePrincipal,
    };

    setIsSaving(true);
    setFormError(null);
    setActionError(null);

    try {
      if (dialogMode === "create") {
        await createDashboard(payload);
      } else if (editingPageId) {
        await updateDashboard(editingPageId, payload);
      }
      closeDialog();
    } catch (error) {
      const message = (error as Error)?.message || "Could not save the page";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetVisibility = async (page: Page, active: boolean) => {
    if (page.active === active) return;
    setActionError(null);
    try {
      await setDashboardVisibility(page._id, active);
    } catch (error) {
      const message =
        (error as Error)?.message || "Could not update page visibility";
      setActionError(message);
    }
  };

  const handleSetPrincipal = async (page: Page) => {
    if (page.principal) return;
    setActionError(null);
    try {
      await setPrincipalDashboard(page._id);
    } catch (error) {
      const message =
        (error as Error)?.message || "Could not mark page as principal";
      setActionError(message);
    }
  };

  const handleApplyPageOrder = async (orderedIds: string[]) => {
    setActionError(null);
    try {
      await reorderDashboardPages(orderedIds);
    } catch (error) {
      const message =
        (error as Error)?.message || "Could not reorder dashboard pages";
      setActionError(message);
    }
  };

  const handleMovePage = async (pageId: string, direction: -1 | 1) => {
    const index = pages.findIndex((page) => page._id === pageId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= pages.length) return;

    const orderedIds = reorderDashboardPageIds(
      pages.map((page) => page._id),
      pageId,
      pages[nextIndex]._id,
    );

    await handleApplyPageOrder(orderedIds);
  };

  const handleDropPage = async (targetPageId: string) => {
    if (!draggedPageId) return;
    const orderedIds = reorderDashboardPageIds(
      pages.map((page) => page._id),
      draggedPageId,
      targetPageId,
    );

    setDraggedPageId(null);
    setDragOverPageId(null);

    if (orderedIds.join("|") === pages.map((page) => page._id).join("|")) {
      return;
    }

    await handleApplyPageOrder(orderedIds);
  };

  const openDeleteDialog = (page: Page) => {
    setPageToDelete(page);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pageToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    setActionError(null);
    try {
      await deleteDashboard(pageToDelete._id);
      setIsDeleteDialogOpen(false);
      setPageToDelete(null);
    } catch (error) {
      const message = (error as Error)?.message || "Could not delete the page";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefreshDashboards = async () => {
    setIsRefreshing(true);
    setActionError(null);
    try {
      await refreshDashboards(currentPage?._id);
      toast.success("Dashboards refreshed");
    } catch (error) {
      const message =
        (error as Error)?.message || "Could not refresh dashboards";
      setActionError(message);
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openTemplatesDialog = async () => {
    setIsTemplatesOpen(true);
    setTemplatesLoading(true);
    try {
      const list = await dashboardService.listTemplates();
      setTemplates(list);
    } catch {
      toast.error("Could not load templates");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    setTemplateCreatingId(templateId);
    try {
      const created = await dashboardService.createFromTemplate(templateId);
      await refreshDashboards(created._id);
      setIsTemplatesOpen(false);
      toast.success("Dashboard created from template");
    } catch (err) {
      toast.error((err as Error).message || "Could not create from template");
    } finally {
      setTemplateCreatingId(null);
    }
  };

  const openVersionsDialog = async () => {
    if (!currentPage) return;
    setIsVersionsOpen(true);
    setVersionsLoading(true);
    try {
      const res = await dashboardService.listVersions(currentPage._id);
      setVersions(res.versions);
    } catch {
      toast.error("Could not load versions");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!currentPage) return;
    setIsSavingVersion(true);
    try {
      await dashboardService.saveVersion(currentPage._id);
      toast.success("Version saved");
      if (isVersionsOpen) {
        const res = await dashboardService.listVersions(currentPage._id);
        setVersions(res.versions);
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not save version");
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!currentPage) return;
    setRestoringVersionId(versionId);
    try {
      const restored = await dashboardService.restoreVersion(
        currentPage._id,
        versionId,
      );
      await refreshDashboards(restored._id);
      setIsVersionsOpen(false);
      toast.success("Version restored");
    } catch (err) {
      toast.error((err as Error).message || "Could not restore version");
    } finally {
      setRestoringVersionId(null);
    }
  };

  if (state.loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner className="size-6 text-primary" />
        <p className="text-muted-foreground text-sm">Loading dashboards...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-var(--header-height)-2rem)] flex-col gap-4 lg:min-h-[calc(100svh-var(--header-height)-3rem)]">
      <section className="rounded-xl border bg-card/80 px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">Dashboards</h1>
              {currentPage ? (
                <Badge variant={currentPage.active ? "default" : "outline"}>
                  {currentPage.active ? "Visible" : "Hidden"}
                </Badge>
              ) : null}
              {currentPage?.principal ? (
                <Badge variant="secondary">
                  <Star className="mr-1 size-3" />
                  Principal
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {currentPage
                ? `${currentPage.name} - ${dashboardStats.moduleCount} module${dashboardStats.moduleCount === 1 ? "" : "s"}`
                : "Create a dashboard to start arranging modules."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void handleRefreshDashboards()}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("mr-2 size-4", isRefreshing && "animate-spin")}
              />
              Refresh
            </Button>
            {/* TODO TEMPLATES */}
            <Button variant="outline" onClick={openTemplatesDialog} disabled>
              <FileText className="mr-2 size-4" />
              Templates
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              New Page
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{pages.length} pages</Badge>
          <Badge variant="outline">Visible: {visiblePageCount}</Badge>
          <Badge variant="outline">Main: {principalPage?.name ?? "None"}</Badge>
          <Badge variant="outline">{dashboardStats.moduleCount} modules</Badge>
          <div className="flex min-w-48 items-center gap-2 rounded-md border bg-background/70 px-3 py-1.5">
            <span className="whitespace-nowrap text-muted-foreground">
              {dashboardStats.occupiedCells}/{dashboardStats.totalCells}
            </span>
            <Progress value={dashboardStats.occupancyPercent} className="h-1" />
          </div>
        </div>
      </section>

      {actionError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Pages</h2>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1}/{Math.max(pages.length, 1)}
            </span>
          </div>
          {pages.length ? (
            <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1">
              {pages.map((page, index) => {
                const isActive = page._id === currentPage?._id;
                const isDragOver =
                  dragOverPageId === page._id && draggedPageId !== page._id;
                return (
                  <Card
                    key={page._id}
                    draggable
                    className={cn(
                      "cursor-grab overflow-hidden transition-all active:cursor-grabbing",
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/60",
                      draggedPageId === page._id && "opacity-45",
                      isDragOver && "border-primary ring-2 ring-primary/30",
                    )}
                    onClick={() => selectDashboard(page._id)}
                    onDragStart={(event) => {
                      setDraggedPageId(page._id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", page._id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverPageId(page._id);
                    }}
                    onDragLeave={() => {
                      setDragOverPageId((current) =>
                        current === page._id ? null : current,
                      );
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDropPage(page._id);
                    }}
                    onDragEnd={() => {
                      setDraggedPageId(null);
                      setDragOverPageId(null);
                    }}
                  >
                    <CardHeader className="grid grid-cols-[1rem_4rem_minmax(0,1fr)_auto] gap-3 p-3">
                      <div className="flex h-20 items-center justify-center text-muted-foreground">
                        <GripVertical className="size-4" />
                      </div>
                      <div className="h-20 rounded-md border bg-muted/30 p-1">
                        <GridPreview
                          modules={page.modules as InstalledModule[]}
                          filledClass={
                            isActive ? "bg-primary/80" : "bg-primary/50"
                          }
                        />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-sm">
                          {page.name}
                        </CardTitle>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={page.active ? "default" : "outline"}>
                            {page.active ? "Visible" : "Hidden"}
                          </Badge>
                          {page.principal ? (
                            <Badge variant="secondary">
                              <Star className="mr-1 size-3" />
                              Main
                            </Badge>
                          ) : null}
                          <span className="truncate text-xs text-muted-foreground">
                            /{page.slug}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {page.modules.length} module
                          {page.modules.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            disabled={index === 0}
                            onSelect={(event) => {
                              event.preventDefault();
                              void handleMovePage(page._id, -1);
                            }}
                          >
                            <ArrowUp className="size-4" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={index === pages.length - 1}
                            onSelect={(event) => {
                              event.preventDefault();
                              void handleMovePage(page._id, 1);
                            }}
                          >
                            <ArrowDown className="size-4" />
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              openEditDialog(page);
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit Information
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={page.principal}
                            onSelect={(event) => {
                              event.preventDefault();
                              void handleSetPrincipal(page);
                            }}
                          >
                            <Star className="size-4" />
                            Mark Principal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              void handleSetVisibility(page, !page.active);
                            }}
                          >
                            {page.active ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                            {page.active
                              ? "Hide from Client"
                              : "Show in Client"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(event) => {
                              event.preventDefault();
                              openDeleteDialog(page);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                You don't have any pages configured yet.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 size-4" />
                Create First Page
              </Button>
            </div>
          )}
        </section>

        {currentPage ? (
          <section className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 pb-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold">
                    {currentPage.name}
                  </h2>
                  <Badge variant="outline">/{currentPage.slug}</Badge>
                  {currentPage.principal ? (
                    <Badge variant="secondary">
                      <Star className="mr-1 size-3" />
                      Principal
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {dashboardStats.moduleCount} widget
                    {dashboardStats.moduleCount === 1 ? "" : "s"}
                  </span>
                  <span>
                    {dashboardStats.occupiedCells}/{dashboardStats.totalCells}{" "}
                    cells
                  </span>
                  {currentPage.updatedAt ? (
                    <span>
                      Updated {new Date(currentPage.updatedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveVersion}
                  disabled={isSavingVersion}
                >
                  <Save className="mr-2 size-4" />
                  {isSavingVersion ? "Saving..." : "Save Version"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openVersionsDialog}
                >
                  <History className="mr-2 size-4" />
                  History
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openEditDialog(currentPage)}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit Page
                </Button>
                <Button
                  variant={currentPage.principal ? "secondary" : "outline"}
                  onClick={() => handleSetPrincipal(currentPage)}
                  disabled={currentPage.principal}
                >
                  <Star className="mr-2 size-4" />
                  {currentPage.principal ? "Principal" : "Make Principal"}
                </Button>
                <Button
                  variant={currentPage.active ? "secondary" : "default"}
                  onClick={() =>
                    handleSetVisibility(currentPage, !currentPage.active)
                  }
                >
                  {currentPage.active ? (
                    <EyeOff className="mr-2 size-4" />
                  ) : (
                    <Eye className="mr-2 size-4" />
                  )}
                  {currentPage.active ? "Hide Client" : "Show Client"}
                </Button>
              </div>
            </div>
            <GridManager
              installed={state.installed}
              onRemove={removeModule}
              onMove={(id, pos) => setModulePosition(id, pos)}
              onUpdateConfig={(id, config) => setModuleConfig(id, config)}
              onRepairLayout={async () => {
                try {
                  await repairDashboardLayout(currentPage._id);
                  toast.success("Layout repaired");
                } catch (error) {
                  toast.error(
                    (error as Error)?.message || "Could not repair the layout",
                  );
                }
              }}
            />
          </section>
        ) : (
          <div className="rounded-lg border border-dashed px-8 py-16 text-center text-sm text-muted-foreground">
            Create a page to start adding modules.
          </div>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create New Page" : "Edit Page"}
            </DialogTitle>
            <DialogDescription>
              Define the name and visibility of your page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="page-name">Name</Label>
              <Input
                id="page-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Main Dashboard"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug">Slug (optional)</Label>
              <Input
                id="page-slug"
                value={formState.slug}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
                placeholder="dashboard-principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-description">Description</Label>
              <Textarea
                id="page-description"
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Describe the purpose of this page"
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox
                id="page-active"
                checked={formState.makeActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({
                    ...prev,
                    makeActive: Boolean(checked),
                    makePrincipal: checked ? prev.makePrincipal : false,
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="page-active" className="text-sm font-medium">
                  Show in Client
                </Label>
                <p className="text-muted-foreground text-xs">
                  Visible pages appear in the client carousel.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox
                id="page-principal"
                checked={formState.makePrincipal}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({
                    ...prev,
                    makePrincipal: Boolean(checked),
                    makeActive: checked ? true : prev.makeActive,
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="page-principal" className="text-sm font-medium">
                  Principal Page
                </Label>
                <p className="text-muted-foreground text-xs">
                  First dashboard shown in the client.
                </p>
              </div>
            </div>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleDialogSubmit} disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : dialogMode === "create"
                  ? "Create Page"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setPageToDelete(null);
            setDeleteError(null);
          } else {
            setIsDeleteDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The modules configured within the
              page will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              You are about to delete <strong>{pageToDelete?.name}</strong>.
            </p>
            <p className="text-muted-foreground">
              {pageToDelete?.modules.length ?? 0} module
              {(pageToDelete?.modules.length ?? 0) === 1 ? "" : "s"} will be
              deleted.
            </p>
            {deleteError ? (
              <p className="text-destructive">{deleteError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setPageToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates dialog */}
      <Dialog open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dashboard Templates</DialogTitle>
            <DialogDescription>
              Create a new dashboard from a pre-built template.
            </DialogDescription>
          </DialogHeader>
          {templatesLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-5" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No templates available.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="hover:border-primary/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    {tpl.description && (
                      <CardDescription>{tpl.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      {tpl.modules} module{tpl.modules === 1 ? "" : "s"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => void handleCreateFromTemplate(tpl.id)}
                      disabled={Boolean(templateCreatingId)}
                    >
                      {templateCreatingId === tpl.id ? "Creating..." : "Use"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Versions dialog */}
      <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Restore a previous version of this dashboard.
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-5" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No versions saved yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {versions.map((v) => (
                <div
                  key={v._id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">Version {v.version}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRestoreVersion(v._id)}
                    disabled={Boolean(restoringVersionId)}
                  >
                    <RotateCcw
                      className={cn(
                        "mr-1 size-4",
                        restoringVersionId === v._id && "animate-spin",
                      )}
                    />
                    {restoringVersionId === v._id ? "Restoring..." : "Restore"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
