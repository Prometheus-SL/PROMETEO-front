import { validateModuleMeta } from "./validation"
import type { ModuleDefinition, ModulesIndexEntry } from "./types"

// Loader de módulos: usa import.meta.glob para descubrir module.json, entries y schemas
// Estructura esperada: /modules/<id>/module.json, index.tsx, config.ts (opcional), preview.* (opcional)

// Mapea todos los module.json bajo /modules/*/
const moduleJsonGlobs = import.meta.glob("/modules/*/module.json", { eager: true, query: "?raw", import: "default" }) as Record<string, string>

// Importadores perezosos para entry, config y preview de cualquier módulo
const entryGlobs = import.meta.glob<{
    default: ModuleDefinition["Component"]
}>("/modules/*/index.{tsx,ts,jsx,js}")
const configGlobs = import.meta.glob<{
    default?: unknown
    schema?: unknown
}>("/modules/*/config.{ts,js}")
// Nota: Vite soporta import de assets como URLs usando el query 'url'; tipamos el options de forma compatible sin usar any.
const previewGlobs = import.meta.glob<string>("/modules/*/preview.*", { query: "?url", import: "default" })

function dirname(path: string) {
    const idx = path.lastIndexOf("/")
    return idx >= 0 ? path.slice(0, idx) : path
}

export async function loadModulesIndex(): Promise<ModulesIndexEntry[]> {
    const entries: ModulesIndexEntry[] = []

    for (const [jsonPath, raw] of Object.entries(moduleJsonGlobs)) {
        try {
            const basePath = dirname(jsonPath)
            const json = JSON.parse(raw)
            const meta = validateModuleMeta(json)

            const entryImporter = Object.entries(entryGlobs).find(([k]) => dirname(k) === basePath)?.[1]
            const configImporter = Object.entries(configGlobs).find(([k]) => dirname(k) === basePath)?.[1]
            const previewImporter = Object.entries(previewGlobs).find(([k]) => dirname(k) === basePath)?.[1]

            entries.push({
                basePath,
                meta,
                importers: {
                    entry: async () => {
                        const mod = (await entryImporter?.()) as unknown
                        return mod
                    },
                    config: configImporter
                        ? async () => {
                            const mod = (await configImporter()) as unknown
                            return mod
                        }
                        : undefined,
                    preview: previewImporter ? async () => await previewImporter() : undefined,
                },
            })
        } catch (e) {
            console.warn("Error cargando módulo", jsonPath, e)
        }
    }

    // Orden simple por nombre
    entries.sort((a, b) => a.meta.name.localeCompare(b.meta.name))
    return entries
}

export async function loadModuleDefinition(entry: ModulesIndexEntry): Promise<ModuleDefinition> {
    const mod = (await entry.importers.entry()) as { default?: ModuleDefinition["Component"] } | unknown
    const maybeObj = mod as Record<string, unknown> | null
    const maybeDefault = maybeObj && (maybeObj["default"] as ModuleDefinition["Component"])
    const maybeNamed = maybeObj && (maybeObj["Component"] as ModuleDefinition["Component"])
    const Component = maybeDefault ?? maybeNamed
    if (!Component) {
        throw new Error(`El entry del módulo ${entry.meta.id} no exporta un componente por defecto ni 'Component'.`)
    }
    let configSchema: unknown | undefined
    if (entry.importers.config) {
        const cfg = (await entry.importers.config()) as Record<string, unknown> | unknown
        const cfgObj = cfg as Record<string, unknown>
        configSchema = (cfgObj && (cfgObj["default"] ?? cfgObj["schema"])) ?? cfg
    }
    return { Component, configSchema }
}
