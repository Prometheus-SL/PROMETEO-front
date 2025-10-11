import { useEffect, useMemo, useState } from "react"
import type { InstalledModule, MarketplaceFilters, ModuleMeta } from "./types"
import { loadModulesIndex } from "./loader"

// Persistencia simple en localStorage (puede reemplazarse por API/DB)
const STORAGE_KEY = "prometeo.installedModules.v1"

export interface MarketplaceState {
    modules: ModuleMeta[]
    loading: boolean
    error?: string
    filters: MarketplaceFilters
    installed: InstalledModule[]
}

export function useMarketplaceStore() {
    const [state, setState] = useState<MarketplaceState>({
        modules: [],
        loading: true,
        filters: { query: "", categories: [], sizes: [] },
        installed: loadFromStorage(),
    })

    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    const index = await loadModulesIndex()
                    if (cancelled) return
                    setState((s) => ({ ...s, modules: index.map((e) => e.meta), loading: false }))
                } catch (e) {
                    if (cancelled) return
                    setState((s) => ({ ...s, loading: false, error: (e as Error).message }))
                }
            })()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        saveToStorage(state.installed)
    }, [state.installed])

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

    function installModule(meta: ModuleMeta, config: Record<string, unknown>) {
        setState((s) => ({ ...s, installed: [...s.installed, { meta, config }] }))
    }

    function removeModule(id: string) {
        setState((s) => ({ ...s, installed: s.installed.filter((i) => i.meta.id !== id) }))
    }

    function setModulePosition(id: string, position?: InstalledModule["position"]) {
        setState((s) => ({
            ...s,
            installed: s.installed.map((i) =>
                i.meta.id === id ? { ...i, position } : i
            ),
        }))
    }

    return {
        state,
        filtered,
        setQuery,
        toggleCategory,
        toggleSize,
        installModule,
        removeModule,
        setModulePosition,
    }
}

function loadFromStorage(): InstalledModule[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as InstalledModule[]
    } catch {
        return []
    }
}

function saveToStorage(data: InstalledModule[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
        // noop
    }
}
