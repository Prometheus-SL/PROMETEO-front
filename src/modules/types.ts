// Tipos e interfaces base para el marketplace de módulos

export type ModuleSize = {
    width: number
    height: number
}

export interface ModuleMeta {
    id: string
    name: string
    description?: string
    category?: string
    size?: ModuleSize
    entry: string
    configSchema?: string
    preview?: string
}

export interface InstalledModule {
    // _id de Instancia en backend (para actualizaciones/eliminaciones)
    _id?: string
    meta: ModuleMeta
    config: Record<string, unknown>
    position?: { x: number; y: number; w: number; h: number }
}

export interface ModuleDefinition {
    // Componente React que renderiza el módulo en el grid.
    Component: React.ComponentType<{ config: Record<string, unknown> }>
    // Schema de configuración exportado por el módulo (opcional).
    configSchema?: unknown
}

export interface ModulesIndexEntry {
    // Ruta base (virtual) del módulo dentro de /modules/<id>/
    basePath: string
    // Metadata proveniente de module.json (validada)
    meta: ModuleMeta
    // Función para importar dinámicamente el entry y el schema
    importers: {
        entry: () => Promise<{ default: ModuleDefinition["Component"] } | unknown>
        config?: () => Promise<{ default?: unknown } | unknown>
        preview?: () => Promise<unknown>
    }
}

export interface MarketplaceFilters {
    query: string
    categories: string[]
    sizes: ModuleSize[]
}

// Page (dashboard) según backend
export interface Page {
    _id: string
    name: string
    slug: string
    description?: string
    style?: Record<string, unknown>
    active: boolean
    order: number
    modules: InstalledModule[]
    createdAt?: string
    updatedAt?: string
}

export type PageSummary = Pick<Page, "_id" | "name" | "slug" | "active" | "order">

export interface PageOrderItem {
    id: string
    order: number
}
