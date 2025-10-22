import { validateModuleMeta } from "./validation"
import type { ModuleDefinition, ModulesIndexEntry } from "./types"

// Loader de módulos: usa import.meta.glob para descubrir module.json, entries y schemas
// Estructura esperada: /modules/<id>/module.json, index.tsx, config.ts (opcional), preview.* (opcional)
// module.json puede ser un objeto único o un array de variantes

// Mapea todos los module.json bajo /modules/*/
const moduleJsonGlobs = import.meta.glob("/modules/*/module.json", { eager: true, query: "?raw", import: "default" }) as Record<string, string>

// Importadores perezosos para entry, config y preview de cualquier módulo
// Soporta múltiples archivos de entrada con diferentes nombres (index.tsx, index2x1.tsx, etc.)
const entryGlobs = import.meta.glob<{
    default: ModuleDefinition["Component"]
}>("/modules/*/*.{tsx,ts,jsx,js}")
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

function resolveEntryPath(basePath: string, entryPath: string): string {
    // Si el entry ya comienza con ./, es relativo al basePath
    if (entryPath.startsWith("./")) {
        return `${basePath}/${entryPath.slice(2)}`
    }
    // Si no, asumimos que es relativo al basePath
    return `${basePath}/${entryPath}`
}

export async function loadModulesIndex(): Promise<ModulesIndexEntry[]> {
    const entries: ModulesIndexEntry[] = []

    for (const [jsonPath, raw] of Object.entries(moduleJsonGlobs)) {
        try {
            const basePath = dirname(jsonPath)
            const json = JSON.parse(raw)

            // Detectar si es array o objeto único
            const metaArray = Array.isArray(json) ? json : [json]

            for (const metaJson of metaArray) {
                const meta = validateModuleMeta(metaJson)

                // Resolver el path completo del entry específico de esta variante
                const fullEntryPath = resolveEntryPath(basePath, meta.entry)

                // Buscar el importador específico para este entry
                const entryImporter = Object.entries(entryGlobs).find(([k]) => {
                    // Comparar sin la extensión del archivo
                    const kWithoutExt = k.replace(/\.(tsx|ts|jsx|js)$/, "")
                    const fullWithoutExt = fullEntryPath.replace(/\.(tsx|ts|jsx|js)$/, "")
                    return kWithoutExt === fullWithoutExt
                })?.[1]

                // Config y preview son compartidos por todas las variantes del módulo
                const configImporter = Object.entries(configGlobs).find(([k]) => dirname(k) === basePath)?.[1]
                const previewImporter = Object.entries(previewGlobs).find(([k]) => dirname(k) === basePath)?.[1]

                entries.push({
                    basePath,
                    meta,
                    importers: {
                        entry: async () => {
                            if (!entryImporter) {
                                throw new Error(`No se encontró el entry ${meta.entry} para el módulo ${meta.id}`)
                            }
                            const mod = (await entryImporter()) as unknown
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
            }
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
