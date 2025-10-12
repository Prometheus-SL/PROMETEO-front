import { useEffect, useMemo, useState } from "react"
import type { InstalledModule, MarketplaceFilters, ModuleMeta } from "./types"
import { loadModulesIndex } from "./loader"
import { dashboardService } from "@/services/dashboards"
import type { Page } from "./types"


export interface MarketplaceState {
    modules: ModuleMeta[]
    loading: boolean
    error?: string
    filters: MarketplaceFilters
    pages: Page[]
    currentPageId?: string
    installed: InstalledModule[] // alias del dashboard actual para compatibilidad con UI existente
}

export function useMarketplaceStore() {
    const [state, setState] = useState<MarketplaceState>({
        modules: [],
        loading: true,
        filters: { query: "", categories: [], sizes: [] },
        pages: [],
        currentPageId: undefined,
        installed: [],
    })

    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    const [index, pages, active] = await Promise.all([
                        loadModulesIndex(),
                        safeListPages(),
                        safeGetActivePage(),
                    ])
                    if (cancelled) return
                    // Selecciona página actual: activa, o la primera, o vacía
                    const current = active ?? pages[0] ?? null
                    setState((s) => ({
                        ...s,
                        modules: index.map((e) => e.meta),
                        pages,
                        currentPageId: current?._id,
                        installed: current?.modules ?? [],
                        loading: false,
                    }))
                } catch (e) {
                    if (cancelled) return
                    setState((s) => ({ ...s, loading: false, error: (e as Error).message }))
                }
            })()
        return () => {
            cancelled = true
        }
    }, [])

    const filtered = useMemo(() => {
        const q = state.filters.query.toLowerCase()
        return state.modules.filter((m) => {
            const matchesQuery = !q || [m.name, m.description ?? "", m.category ?? ""].some((t) => t.toLowerCase().includes(q))
            const matchesCat = state.filters.categories.length === 0 || (m.category && state.filters.categories.includes(m.category))
            const matchesSize = state.filters.sizes.length === 0 || (m.size && state.filters.sizes.includes(m.size))
            return matchesQuery && matchesCat && matchesSize
        })
    }, [state.modules, state.filters])

    function setQuery(query: string) {
        setState((s) => ({ ...s, filters: { ...s.filters, query } }))
    }

    function toggleCategory(cat: string) {
        setState((s) => {
            const exists = s.filters.categories.includes(cat)
            const categories = exists ? s.filters.categories.filter((c) => c !== cat) : [...s.filters.categories, cat]
            return { ...s, filters: { ...s.filters, categories } }
        })
    }
    function toggleSize(size: string) {
        setState((s) => {
            const sz = size as unknown as MarketplaceFilters["sizes"][number]
            const exists = s.filters.sizes.includes(sz)
            const sizes = exists ? s.filters.sizes.filter((c) => c !== sz) : [...s.filters.sizes, sz]
            return { ...s, filters: { ...s.filters, sizes } }
        })
    }

    function installModuleTo(pageId: string, meta: ModuleMeta, config: Record<string, unknown>) {
        // posición inicial la decide el GridManager, aquí opcional
        void dashboardService.addModule(pageId, { meta, config }).then(({ module }) => {
            setState((s) => {
                const pages = s.pages.map((p) => p._id === pageId ? { ...p, modules: [...p.modules, module] } : p)
                const installed = s.currentPageId === pageId ? [...s.installed, module] : s.installed
                return { ...s, pages, installed }
            })
        }).catch(() => { /* noop */ })
    }

    function installModule(meta: ModuleMeta, config: Record<string, unknown>) {
        if (!state.currentPageId) return
        installModuleTo(state.currentPageId, meta, config)
    }

    function removeModule(id: string) {
        if (!state.currentPageId) return
        const mod = state.installed.find((m) => (m._id ?? m.meta.id) === id)
        const moduleId = mod?._id
        if (!moduleId) {
            // si no tiene _id, quita localmente
            setState((s) => ({ ...s, installed: s.installed.filter((i) => (i._id ?? i.meta.id) !== id) }))
            return
        }
        void dashboardService.removeModule(state.currentPageId, moduleId).then(() => {
            setState((s) => ({ ...s, installed: s.installed.filter((i) => (i._id ?? i.meta.id) !== id) }))
        }).catch(() => { /* noop */ })
    }

    function setModulePosition(id: string, position?: InstalledModule["position"]) {
        // Actualiza estado local
        setState((s) => ({
            ...s,
            installed: s.installed.map((i) =>
                (i._id === id || i.meta.id === id) ? { ...i, position } : i
            ),
        }))
        // Persistencia individual inmediata si hay _id
        const pageId = state.currentPageId
        const mod = state.installed.find((m) => m._id === id || m.meta.id === id)
        const moduleId = mod?._id
        if (pageId && moduleId && position) {
            void dashboardService.updateModule(pageId, moduleId, { position }).catch(() => { /* noop */ })
        }
        // Además, el effect realizará un reorder en bloque si fuera necesario
    }

    function setModuleConfig(id: string, config: Record<string, unknown>) {
        // Actualiza estado local: installed y la página actual en pages
        setState((s) => {
            const installed = s.installed.map((i) =>
                (i._id === id || i.meta.id === id) ? { ...i, config } : i
            )
            const pages = s.pages.map((p) =>
                p._id === s.currentPageId
                    ? { ...p, modules: p.modules.map((m) => (m._id === id || m.meta.id === id) ? { ...m, config } : m) }
                    : p
            )
            return { ...s, installed, pages }
        })

        // Persistencia si hay _id
        const pageId = state.currentPageId
        const mod = state.installed.find((m) => m._id === id || m.meta.id === id)
        const moduleId = mod?._id
        if (pageId && moduleId) {
            void dashboardService.updateModule(pageId, moduleId, { config }).catch(() => { /* noop */ })
        }
    }

    function selectDashboard(id: string) {
        setState((s) => {
            const p = s.pages.find((p) => p._id === id)
            if (!p) return s
            return { ...s, currentPageId: id, installed: p.modules }
        })
    }

    async function createDashboard(name: string) {
        const created = await dashboardService.createPage({ name, active: true })
        setState((s) => ({
            ...s,
            pages: [...s.pages, created],
            currentPageId: created._id,
            installed: [],
        }))
    }

    async function deleteDashboard(id: string) {
        await dashboardService.deletePage(id)
        setState((s) => {
            const pages = s.pages.filter((p) => p._id !== id)
            const currentPageId = s.currentPageId === id ? pages[0]?._id : s.currentPageId
            const installed = currentPageId ? (pages.find((p) => p._id === currentPageId)?.modules ?? []) : []
            return { ...s, pages, currentPageId, installed }
        })
    }

    async function activateDashboard(id: string) {
        const updated = await dashboardService.updatePage(id, { active: true })
        setState((s) => {
            const pages = s.pages.map((p) => ({ ...p, active: p._id === id }))
            const currentPageId = id
            const installed = updated.modules ?? []
            return { ...s, pages, currentPageId, installed }
        })
    }

    return {
        state,
        filtered,
        setQuery,
        toggleCategory,
        toggleSize,
        installModule,
        installModuleTo,
        removeModule,
        setModulePosition,
        setModuleConfig,
        selectDashboard,
        createDashboard,
        deleteDashboard,
        activateDashboard,
    }
}

async function safeListPages(): Promise<Page[]> {
    try {
        return await dashboardService.listPages()
    } catch {
        return []
    }
}

async function safeGetActivePage(): Promise<Page | null> {
    try {
        return await dashboardService.getActivePage()
    } catch {
        return null
    }
}
