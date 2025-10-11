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
