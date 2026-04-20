import { api } from "@/lib/api";
import type {
    InstalledModule,
    Page,
    PageOrderItem,
    PageSummary,
} from "@/modules/types";

export type DashboardFeedItem = {
    id: string
    type: string
    title: string
    message: string
    createdAt?: string | null
    provider?: string
    status?: string
    agentId?: string
    agentName?: string
    dataType?: string
    payload?: Record<string, unknown>
}

export const dashboardService = {
    async listPages(): Promise<Page[]> {
        const data = await api.getData<{ pages: Page[] }>("/api/v1/dashboard/pages");
        return data.pages ?? [];
    },
    async listPageSummaries(): Promise<PageSummary[]> {
        const data = await api.getData<{ pages: PageSummary[] }>("/api/v1/dashboard/pages/summary");
        return data.pages ?? [];
    },
    async getActivePage(): Promise<Page | null> {
        const data = await api.getData<{ page: Page | null }>("/api/v1/dashboard/pages/active");
        return data.page ?? null;
    },
    async getPageBySlug(slug: string): Promise<Page> {
        const data = await api.getData<{ page: Page }>(`/api/v1/dashboard/pages/by-slug/${encodeURIComponent(slug)}`);
        return data.page;
    },
    async getPage(id: string): Promise<Page> {
        const data = await api.getData<{ page: Page }>(`/api/v1/dashboard/pages/${id}`);
        return data.page;
    },
    async createPage(payload: Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active" | "principal">>): Promise<Page> {
        const data = await api.postData<{ page: Page }>("/api/v1/dashboard/pages", payload);
        return data.page;
    },
    async updatePage(id: string, payload: Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active" | "principal">>): Promise<Page> {
        const data = await api.patchData<{ page: Page }>(`/api/v1/dashboard/pages/${id}`, payload);
        return data.page;
    },
    async deletePage(id: string): Promise<void> {
        await api.deleteData<null>(`/api/v1/dashboard/pages/${id}`);
    },
    async reorderPages(items: PageOrderItem[]): Promise<void> {
        await api.patchData<null>(`/api/v1/dashboard/pages/reorder`, { items });
    },
    async addModule(pageId: string, mod: Omit<InstalledModule, "_id">): Promise<{ page: Page; module: InstalledModule }> {
        return api.postData<{ page: Page; module: InstalledModule }>(`/api/v1/dashboard/pages/${pageId}/modules`, mod);
    },
    async updateModule(pageId: string, moduleId: string, payload: Partial<Pick<InstalledModule, "meta" | "config" | "position">>): Promise<void> {
        await api.patchData<null>(`/api/v1/dashboard/pages/${pageId}/modules/${moduleId}`, payload);
    },
    async removeModule(pageId: string, moduleId: string): Promise<void> {
        await api.deleteData<null>(`/api/v1/dashboard/pages/${pageId}/modules/${moduleId}`);
    },
    async reorderModules(pageId: string, positions: Array<{ moduleId: string; position: NonNullable<InstalledModule["position"]> }>): Promise<void> {
        await api.patchData<null>(`/api/v1/dashboard/pages/${pageId}/modules/reorder`, { positions });
    },
    async getFeed(limit = 10): Promise<DashboardFeedItem[]> {
        const query = new URLSearchParams({ limit: String(limit) })
        const data = await api.getData<{ items: DashboardFeedItem[] }>(`/api/v1/dashboard/feed?${query.toString()}`)
        return data.items ?? []
    },

    // --- Templates ---
    async listTemplates(): Promise<DashboardTemplate[]> {
        const data = await api.getData<{ templates: DashboardTemplate[] }>("/api/v1/dashboard/templates");
        return data.templates ?? [];
    },
    async createFromTemplate(templateId: string): Promise<Page> {
        const data = await api.postData<{ page: Page }>("/api/v1/dashboard/pages/from-template", { templateId });
        return data.page;
    },

    // --- Version history ---
    async listVersions(pageId: string, params?: { page?: number; limit?: number }): Promise<DashboardVersionsResponse> {
        const q = new URLSearchParams();
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        return api.getData<DashboardVersionsResponse>(`/api/v1/dashboard/pages/${pageId}/versions${q.toString() ? `?${q}` : ""}`);
    },
    async saveVersion(pageId: string): Promise<DashboardVersion> {
        const data = await api.postData<{ version: DashboardVersion }>(`/api/v1/dashboard/pages/${pageId}/versions`, {});
        return data.version;
    },
    async restoreVersion(pageId: string, versionId: string): Promise<Page> {
        const data = await api.postData<{ page: Page }>(`/api/v1/dashboard/pages/${pageId}/versions/${versionId}/restore`, {});
        return data.page;
    },
};

export type DashboardTemplate = {
    id: string;
    name: string;
    description: string;
    modules: number;
};

export type DashboardVersion = {
    _id: string;
    pageId: string;
    version: number;
    changedBy?: string;
    createdAt: string;
};

export type DashboardVersionsResponse = {
    versions: DashboardVersion[];
    pagination: { current: number; pages: number; total: number };
};
