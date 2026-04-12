import { useMemo, useState } from "react";
import {
  Plus,
  MoreVertical,
  CheckCircle2,
  LayoutDashboard,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import CarouselPagination from "@/components/CarouselPagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMarketplaceStore } from "@/modules/store";
import type { Page } from "@/modules/types";
import { GridManager } from "@/modules/ui/GridManager";
import BadgeSelectable from "@/components/common/badgeSelect";

type PageFormState = {
  name: string;
  slug: string;
  description: string;
  makeActive: boolean;
};

export default function DashboardsPage() {
  const {
    state,
    removeModule,
    setModulePosition,
    setModuleConfig,
    selectDashboard,
    createDashboard,
    deleteDashboard,
    activateDashboard,
    updateDashboard,
    repairDashboardLayout,
  } = useMarketplaceStore();

  const pages = useMemo(
    () => [...state.pages].sort((a, b) => a.order - b.order),
    [state.pages]
  );

  const currentIndex = Math.max(
    0,
    pages.findIndex((page) => page._id === state.currentPageId)
  );
  const currentPage = pages[currentIndex] ?? null;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<PageFormState>({
    name: "",
    slug: "",
    description: "",
    makeActive: true,
  });
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const resetFormState = (page?: Page) => {
    if (page) {
      setFormState({
        name: page.name,
        slug: page.slug ?? "",
        description: page.description ?? "",
        makeActive: page.active,
      });
    } else {
      setFormState({
        name: "",
        slug: "",
        description: "",
        makeActive: pages.length === 0,
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
      active: formState.makeActive,
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

  const handleActivate = async (page: Page) => {
    if (page.active) return;
    setActionError(null);
    try {
      await activateDashboard(page._id);
    } catch (error) {
      const message =
        (error as Error)?.message || "Could not activate the page";
      setActionError(message);
    }
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

  if (state.loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner className="size-6 text-primary" />
        <p className="text-muted-foreground text-sm">Loading dashboards…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Dashboards</h1>
          <p className="text-muted-foreground text-sm">
            Organize your pages, define which one is active, and edit its
            information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            New Page
          </Button>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <CarouselPagination
        items={pages}
        selectedIndex={pages.length ? currentIndex : 0}
        onSelect={(page) => selectDashboard(page._id)}
        emptyPlaceholder={
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-8 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              You don't have any pages configured yet.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Create First Page
            </Button>
          </div>
        }
        renderItem={(page, { isActive, onSelect }) => (
          <Card
            className={cn(
              "h-full justify-between",
              isActive ? "border-primary shadow-md" : "hover:border-primary/60"
            )}
            onClick={onSelect}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutDashboard className="size-4 text-muted-foreground" />
                {page.name}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {page.description ? page.description : "No description provided"}
              </CardDescription>
              <CardAction>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      data-card-action
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        openEditDialog(page);
                      }}
                    >
                      <Pencil className="size-4" />
                      Edit Information
                    </DropdownMenuItem>
                    {!page.active ? (
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          void handleActivate(page);
                        }}
                      >
                        <CheckCircle2 className="size-4" />
                        Activate
                      </DropdownMenuItem>
                    ) : null}
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
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {page.modules.length} module
                  {page.modules.length === 1 ? "" : "s"}
                </span>
                <BadgeSelectable
                  selected={page.active}
                  onChange={() => handleActivate(page)}
                  text={page.active ? "Activated" : "Activate"}
                />
              </div>
            </CardContent>
          </Card>
        )}
      />

      {currentPage ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{currentPage.name}</h2>
              <p className="text-muted-foreground text-sm">
                Drag and drop to customize the modules on this page.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => openEditDialog(currentPage)}
              >
                <Pencil className="mr-2 size-4" />
                Edit Page
              </Button>
              <Button
                variant={currentPage.active ? "secondary" : "default"}
                onClick={() => handleActivate(currentPage)}
                disabled={currentPage.active}
              >
                {currentPage.active ? "Active Page" : "Activate"}
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
                  (error as Error)?.message || "Could not repair the layout"
                );
              }
            }}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-8 py-16 text-center text-sm text-muted-foreground">
          Create a page to start adding modules.
        </div>
      )}

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
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="page-active" className="text-sm font-medium">
                  Mark as Active
                </Label>
                <p className="text-muted-foreground text-xs">
                  {dialogMode === "create"
                    ? "This will activate the page upon creation"
                    : "If active, it will replace the current page"}
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
                ? "Saving…"
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
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
