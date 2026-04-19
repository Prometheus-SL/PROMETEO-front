import { validateModuleMeta } from "./validation";
import type { ModuleDefinition, ModulesIndexEntry } from "./types";

const moduleJsonGlobs = import.meta.glob("/modules/*/module.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const entryGlobs = import.meta.glob<{
  default: ModuleDefinition["Component"];
}>("/modules/*/*.{tsx,ts,jsx,js}");

const configGlobs = import.meta.glob<{
  default?: unknown;
  schema?: unknown;
}>("/modules/*/config.{ts,js}");

const previewGlobs = import.meta.glob<string>("/modules/*/preview*.{png,jpg,jpeg,webp,svg,avif}", {
  query: "?url",
  import: "default",
});

let modulesIndexPromise: Promise<ModulesIndexEntry[]> | null = null;
const moduleDefinitionCache = new Map<string, ModuleDefinition>();
const moduleDefinitionPromises = new Map<string, Promise<ModuleDefinition>>();
const moduleConfigSchemaCache = new Map<string, unknown>();
const moduleConfigSchemaPromises = new Map<string, Promise<unknown>>();

function dirname(path: string) {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : path;
}

function resolveEntryPath(basePath: string, entryPath: string): string {
  if (entryPath.startsWith("./")) {
    return `${basePath}/${entryPath.slice(2)}`;
  }
  return `${basePath}/${entryPath}`;
}

export async function loadModulesIndex(): Promise<ModulesIndexEntry[]> {
  if (modulesIndexPromise) {
    return modulesIndexPromise;
  }

  modulesIndexPromise = (async () => {
    const entries: ModulesIndexEntry[] = [];

    for (const [jsonPath, raw] of Object.entries(moduleJsonGlobs)) {
      try {
        const basePath = dirname(jsonPath);
        const json = JSON.parse(raw);
        const metaArray = Array.isArray(json) ? json : [json];

        for (const metaJson of metaArray) {
          const meta = validateModuleMeta(metaJson);
          const fullEntryPath = resolveEntryPath(basePath, meta.entry);

          const entryImporter = Object.entries(entryGlobs).find(([path]) => {
            const pathWithoutExt = path.replace(/\.(tsx|ts|jsx|js)$/, "");
            const entryWithoutExt = fullEntryPath.replace(
              /\.(tsx|ts|jsx|js)$/,
              ""
            );
            return pathWithoutExt === entryWithoutExt;
          })?.[1];

          const configImporter = Object.entries(configGlobs).find(
            ([path]) => dirname(path) === basePath
          )?.[1];

          const previewImporter = (() => {
            if (meta.preview) {
              const fullPreviewPath = resolveEntryPath(basePath, meta.preview);
              return Object.entries(previewGlobs).find(([path]) => {
                const pathNoExt = path.replace(/\.[^.]+$/, "");
                const previewNoExt = fullPreviewPath.replace(/\.[^.]+$/, "");
                return pathNoExt === previewNoExt;
              })?.[1];
            }
            return Object.entries(previewGlobs).find(
              ([path]) => dirname(path) === basePath
            )?.[1];
          })();

          entries.push({
            basePath,
            meta,
            importers: {
              entry: async () => {
                if (!entryImporter) {
                  throw new Error(
                    `Module entry ${meta.entry} for ${meta.id} was not found.`
                  );
                }
                return (await entryImporter()) as unknown;
              },
              config: configImporter
                ? async () => {
                  return (await configImporter()) as unknown;
                }
                : undefined,
              preview: previewImporter
                ? async () => await previewImporter()
                : undefined,
            },
          });
        }
      } catch (error) {
        console.warn("Error loading module", jsonPath, error);
      }
    }

    entries.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    return entries;
  })().catch((error) => {
    modulesIndexPromise = null;
    throw error;
  });

  return modulesIndexPromise;
}

export async function loadModuleDefinition(
  entry: ModulesIndexEntry
): Promise<ModuleDefinition> {
  const cacheKey = entry.meta.id;
  const cached = moduleDefinitionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = moduleDefinitionPromises.get(cacheKey);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const mod = (await entry.importers.entry()) as
      | { default?: ModuleDefinition["Component"] }
      | unknown;
    const maybeObject = mod as Record<string, unknown> | null;
    const maybeDefault =
      maybeObject && (maybeObject.default as ModuleDefinition["Component"]);
    const maybeNamed =
      maybeObject && (maybeObject.Component as ModuleDefinition["Component"]);
    const Component = maybeDefault ?? maybeNamed;

    if (!Component) {
      throw new Error(
        `The module entry for ${entry.meta.id} does not export a default component or Component.`
      );
    }

    const configSchema = await loadModuleConfigSchema(entry);

    const definition = { Component, configSchema };
    moduleDefinitionCache.set(cacheKey, definition);
    return definition;
  })().finally(() => {
    moduleDefinitionPromises.delete(cacheKey);
  });

  moduleDefinitionPromises.set(cacheKey, promise);
  return promise;
}

export async function loadModuleConfigSchema(
  entry: ModulesIndexEntry
): Promise<unknown | undefined> {
  const cacheKey = entry.meta.id;

  if (moduleConfigSchemaCache.has(cacheKey)) {
    return moduleConfigSchemaCache.get(cacheKey);
  }

  const pending = moduleConfigSchemaPromises.get(cacheKey);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    if (!entry.importers.config) {
      moduleConfigSchemaCache.set(cacheKey, undefined);
      return undefined;
    }

    const cfg = (await entry.importers.config()) as Record<string, unknown> | unknown;
    const cfgObject = cfg as Record<string, unknown> | null;
    const configSchema = (cfgObject && (cfgObject.default ?? cfgObject.schema)) ?? cfg;

    moduleConfigSchemaCache.set(cacheKey, configSchema);
    return configSchema;
  })().finally(() => {
    moduleConfigSchemaPromises.delete(cacheKey);
  });

  moduleConfigSchemaPromises.set(cacheKey, promise);
  return promise;
}
