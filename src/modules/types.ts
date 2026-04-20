// Tipos e interfaces base para el marketplace de modulos

export type ModuleSize = {
    width: number
    height: number
}

export type ModuleAudience = "all" | "dashboard" | "client" | "ops"
export type ModuleRole = "viewer" | "user" | "operator" | "admin"

export interface ModuleMarketplaceMeta {
    familyId?: string
    familyName?: string
    variantLabel?: string
    variantOrder?: number
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
    audience?: ModuleAudience
    requiredProviders?: string[]
    requiredRole?: ModuleRole | null
    capabilities?: string[]
    marketplace?: ModuleMarketplaceMeta
}

export interface InstalledModule {
    // _id de Instancia en backend (para actualizaciones/eliminaciones)
    _id?: string
    meta: ModuleMeta
    config: Record<string, unknown>
    position?: { x: number; y: number; w: number; h: number }
}

export interface ModuleDefinition {
    // Componente React que renderiza el modulo en el grid.
    Component: React.ComponentType<{ config: Record<string, unknown> }>
    // Schema de configuracion exportado por el modulo (opcional).
    configSchema?: unknown
}

export interface ModulesIndexEntry {
    // Ruta base (virtual) del modulo dentro de /modules/<id>/
    basePath: string
    // Metadata proveniente de module.json (validada)
    meta: ModuleMeta
    // Funcion para importar dinamicamente el entry y el schema
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
    providers: string[]
    status: "all" | "ready" | "needs-connection" | "restricted"
}

// Page (dashboard) segun backend
export interface Page {
    _id: string
    name: string
    slug: string
    description?: string
    style?: Record<string, unknown>
    active: boolean
    principal?: boolean
    order: number
    modules: InstalledModule[]
    createdAt?: string
    updatedAt?: string
}

export type PageSummary = Pick<Page, "_id" | "name" | "slug" | "active" | "principal" | "order">

export interface PageOrderItem {
    id: string
    order: number
}
