import { api } from "@/lib/api";
import type {
    InstalledModule,
    Page,
    PageOrderItem,
    PageSummary,
} from "@/modules/types";

type ApiFailure = { success: false; message?: string };

function extract<T>(res: unknown, key: string): T {
    const r = res as Record<string, unknown>;
    if (r && "success" in r && (r.success as boolean) === false) {
        const msg = (r as ApiFailure)?.message || (r["error"] as string) || "Error de API";
        throw new Error(msg);
    }
    const data = (r.data as Record<string, unknown>) || r;
    return (data[key] as T) ?? (r[key] as T);
}

export const dashboardService = {
    // Páginas (dashboards) del usuario
    async listPages(): Promise<Page[]> {
        const res = await api.get<unknown | ApiFailure>("/api/v1/dashboard/pages");
        return (extract<Page[]>(res, "pages") || []).map((p) => p);
    },
    async listPageSummaries(): Promise<PageSummary[]> {
        const res = await api.get<unknown | ApiFailure>("/api/v1/dashboard/pages/summary");
        return (extract<PageSummary[]>(res, "pages") || []).map((p) => p);
    },
    async getActivePage(): Promise<Page | null> {
        const res = await api.get<unknown | ApiFailure>("/api/v1/dashboard/pages/active");
        return extract<Page | null>(res, "page") ?? null;
    },
    async getPageBySlug(slug: string): Promise<Page> {
        const res = await api.get<unknown | ApiFailure>(`/api/v1/dashboard/pages/by-slug/${encodeURIComponent(slug)}`);
        return extract<Page>(res, "page");
    },
    async getPage(id: string): Promise<Page> {
        const res = await api.get<unknown | ApiFailure>(`/api/v1/dashboard/pages/${id}`);
        return extract<Page>(res, "page");
    },
    async createPage(payload: Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active">>): Promise<Page> {
        const res = await api.post<unknown | ApiFailure>("/api/v1/dashboard/pages", payload);
        return extract<Page>(res, "page");
    },
    async updatePage(id: string, payload: Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active">>): Promise<Page> {
        const res = await api.patch<unknown | ApiFailure>(`/api/v1/dashboard/pages/${id}`, payload);
        return extract<Page>(res, "page");
    },
    async deletePage(id: string): Promise<void> {
        await api.delete<unknown | ApiFailure>(`/api/v1/dashboard/pages/${id}`);
    },
    async reorderPages(items: PageOrderItem[]): Promise<void> {
        await api.patch<unknown | ApiFailure>(`/api/v1/dashboard/pages/reorder`, { items });
    },

    // Módulos
    async addModule(pageId: string, mod: Omit<InstalledModule, "_id">): Promise<{ page: Page; module: InstalledModule }> {
        const res = await api.post<unknown | ApiFailure>(`/api/v1/dashboard/pages/${pageId}/modules`, mod);
        return {
            page: extract<Page>(res, "page"),
            module: extract<InstalledModule>(res, "module"),
        };
    },
    async updateModule(pageId: string, moduleId: string, payload: Partial<Pick<InstalledModule, "meta" | "config" | "position">>): Promise<void> {
        await api.patch<unknown | ApiFailure>(`/api/v1/dashboard/pages/${pageId}/modules/${moduleId}`, payload);
    },
    async removeModule(pageId: string, moduleId: string): Promise<void> {
        await api.delete<unknown | ApiFailure>(`/api/v1/dashboard/pages/${pageId}/modules/${moduleId}`);
    },
    async reorderModules(pageId: string, positions: Array<{ moduleId: string; position: NonNullable<InstalledModule["position"]> }>): Promise<void> {
        await api.patch<unknown | ApiFailure>(`/api/v1/dashboard/pages/${pageId}/modules/reorder`, { positions });
    },
};
