import { useEffect, useMemo, useState } from "react"
import type { InstalledModule, MarketplaceFilters, ModuleMeta } from "./types"
import { loadModulesIndex } from "./loader"
import { dashboardService } from "@/services/dashboards"
import type { Page } from "./types"
import { analyzeInstalledModules, getCandidatePlacement } from "./grid-layout"


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
                    const resolvedMetas = await Promise.all(
                        index.map(async (e) => {
                            if (!e.importers.preview) return e.meta
                            try {
                                const url = await e.importers.preview()
                                return { ...e.meta, preview: url as string }
                            } catch {
                                return e.meta
                            }
                        }),
                    )
                    setState((s) => ({
                        ...s,
                        modules: resolvedMetas,
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
    function clearCategories() {
        setState((s) => ({ ...s, filters: { ...s.filters, categories: [] } }))
    }
    function toggleSize(size: MarketplaceFilters["sizes"][number]) {
        setState((s) => {
            const exists = s.filters.sizes.includes(size)
            const sizes = exists ? s.filters.sizes.filter((c) => c !== size) : [...s.filters.sizes, size]
            return { ...s, filters: { ...s.filters, sizes } }
        })
    }

    function clearSizes() {
        setState((s) => ({ ...s, filters: { ...s.filters, sizes: [] } }))
    }

    function resetFilters() {
        setState((s) => ({
            ...s,
            filters: {
                query: "",
                categories: [],
                sizes: [],
            },
        }))
    }

    async function installModuleTo(pageId: string, meta: ModuleMeta, config: Record<string, unknown>) {
        const page = state.pages.find((candidatePage) => candidatePage._id === pageId)
        if (!page) {
            throw new Error("The selected dashboard could not be found")
        }

        const placement = getCandidatePlacement(page.modules, meta, config)
        if (!placement.position) {
            throw new Error(
                `No hay espacio libre para un widget ${placement.size.w}x${placement.size.h} en "${page.name}".`
            )
        }
        const nextPosition = placement.position

        const { module } = await dashboardService.addModule(pageId, {
            meta,
            config,
            position: nextPosition,
        })

        setState((s) => {
            const pages = s.pages.map((candidatePage) => {
                if (candidatePage._id !== pageId) {
                    return candidatePage
                }

                const resolvedExistingModules = candidatePage.modules.map((existingModule) => {
                    const key = existingModule._id ?? existingModule.meta.id
                    return {
                        ...existingModule,
                        position: placement.analysis.positions[key] ?? existingModule.position,
                    }
                })

                return {
                    ...candidatePage,
                    modules: [
                        ...resolvedExistingModules,
                        { ...module, position: nextPosition },
                    ],
                }
            })

            const currentPage = pages.find((candidatePage) => candidatePage._id === s.currentPageId)
            return {
                ...s,
                pages,
                installed: currentPage?.modules ?? s.installed,
            }
        })

        return module
    }

    async function installModule(meta: ModuleMeta, config: Record<string, unknown>) {
        if (!state.currentPageId) {
            throw new Error("Select a dashboard before adding a widget")
        }

        return installModuleTo(state.currentPageId, meta, config)
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
        setState((s) => {
            const installed = s.installed.map((i) =>
                (i._id === id || i.meta.id === id) ? { ...i, position } : i
            )
            const pages = s.pages.map((p) =>
                p._id === s.currentPageId
                    ? {
                        ...p,
                        modules: p.modules.map((m) =>
                            (m._id === id || m.meta.id === id) ? { ...m, position } : m
                        ),
                    }
                    : p
            )
            return {
                ...s,
                installed,
                pages,
            }
        })
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

    async function repairDashboardLayout(pageId = state.currentPageId) {
        if (!pageId) {
            throw new Error("Select a dashboard before repairing its layout")
        }

        const page = state.pages.find((candidatePage) => candidatePage._id === pageId)
        if (!page) {
            throw new Error("The selected dashboard could not be found")
        }

        const analysis = analyzeInstalledModules(page.modules)
        if (!analysis.needsRepair) {
            return
        }

        if (!analysis.canRepair) {
            throw new Error("This dashboard has more widgets than the grid can hold. Remove some widgets before repairing it.")
        }

        const positions = page.modules.flatMap((module) => {
            const key = module._id ?? module.meta.id
            const position = analysis.positions[key]
            if (!module._id || !position) {
                return []
            }

            return [{
                moduleId: module._id,
                position,
            }]
        })

        if (positions.length > 0) {
            await dashboardService.reorderModules(pageId, positions)
        }

        setState((s) => {
            const pages = s.pages.map((candidatePage) => {
                if (candidatePage._id !== pageId) {
                    return candidatePage
                }

                return {
                    ...candidatePage,
                    modules: candidatePage.modules.map((module) => {
                        const key = module._id ?? module.meta.id
                        return {
                            ...module,
                            position: analysis.positions[key] ?? module.position,
                        }
                    }),
                }
            })

            const currentPage = pages.find((candidatePage) => candidatePage._id === s.currentPageId)
            return {
                ...s,
                pages,
                installed: currentPage?.modules ?? s.installed,
            }
        })
    }

    function selectDashboard(id: string) {
        setState((s) => {
            const p = s.pages.find((p) => p._id === id)
            if (!p) return s
            return { ...s, currentPageId: id, installed: p.modules }
        })
    }

    async function createDashboard(name: string): Promise<Page>
    async function createDashboard(payload: Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active">>): Promise<Page>
    async function createDashboard(input: string | Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active">>): Promise<Page> {
        const basePayload = typeof input === "string" ? { name: input } : input
        if (!basePayload?.name) {
            throw new Error("Name is required")
        }
        const shouldBeActive = basePayload.active ?? state.pages.length === 0
        const created = await dashboardService.createPage({ ...basePayload, active: shouldBeActive })
        setState((s) => {
            const pages = [
                ...s.pages.map((p) => (created.active ? { ...p, active: false } : p)),
                created,
            ]
            return {
                ...s,
                pages,
                currentPageId: created._id,
                installed: created.modules ?? [],
            }
        })
        return created
    }

    async function updateDashboard(id: string, payload: Partial<Pick<Page, "name" | "slug" | "description" | "style" | "active">>): Promise<Page> {
        const updated = await dashboardService.updatePage(id, payload)
        setState((s) => {
            const pages = s.pages.map((p) => {
                if (p._id === id) return updated
                return updated.active ? { ...p, active: false } : p
            })
            const isCurrent = s.currentPageId === id
            const currentPageId = updated.active ? updated._id : isCurrent ? updated._id : s.currentPageId
            const installed = updated.active || isCurrent ? (updated.modules ?? []) : s.installed
            return {
                ...s,
                pages,
                currentPageId,
                installed,
            }
        })
        return updated
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
        clearSizes,
        installModule,
        installModuleTo,
        removeModule,
        setModulePosition,
        setModuleConfig,
        clearCategories,
        resetFilters,
        selectDashboard,
        createDashboard,
        deleteDashboard,
        activateDashboard,
        updateDashboard,
        repairDashboardLayout,
    }
}

export type MarketplaceStore = ReturnType<typeof useMarketplaceStore>

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
