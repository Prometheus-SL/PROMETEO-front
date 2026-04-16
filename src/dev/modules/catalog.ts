import {
  loadModuleDefinition,
  loadModulesIndex,
} from "@/modules/loader";
import type { ModuleDefinition, ModulesIndexEntry } from "@/modules/types";

import {
  getDefaultPreset,
  getPresetsForEntry,
  resolveConfigDefaults,
} from "./helpers";
import type {
  ModuleDevDefinition,
  ModuleDevMockAdapter,
  ModuleDevPreset,
} from "./types";

export type ModuleDevCatalogItem = {
  entry: ModulesIndexEntry;
  definition: ModuleDevDefinition;
  defaultPreset: ModuleDevPreset;
  presets: ModuleDevPreset[];
  hasMockAdapter: boolean;
};

export type ModuleDevRuntimeEntry = {
  entry: ModulesIndexEntry;
  module: ModuleDefinition;
  definition: ModuleDevDefinition;
  defaultPreset: ModuleDevPreset;
  presets: ModuleDevPreset[];
  hasMockAdapter: boolean;
};

const definitionModules = import.meta.glob<{
  default: ModuleDevDefinition;
}>("/modules/*/dev.ts", {
  eager: true,
});
const mockAdapterModules = import.meta.glob<{
  default: ModuleDevMockAdapter;
}>("/modules/*/dev.mock.ts");

let definitionsByBasePathCache: Map<string, ModuleDevDefinition> | null = null;
let devCatalogPromise: Promise<ModuleDevCatalogItem[]> | null = null;

function getBasePathFromDevPath(path: string) {
  return path.replace(/\/dev\.ts$/, "");
}

function getDefinitionsByBasePath() {
  if (definitionsByBasePathCache) {
    return definitionsByBasePathCache;
  }

  const definitions = new Map<string, ModuleDevDefinition>();

  for (const [path, mod] of Object.entries(definitionModules)) {
    if (!mod.default) {
      continue;
    }

    definitions.set(getBasePathFromDevPath(path), mod.default);
  }

  definitionsByBasePathCache = definitions;
  return definitions;
}

function validateExplicitDefinition(
  basePath: string,
  definition: ModuleDevDefinition | undefined,
  entries: ModulesIndexEntry[],
) {
  if (!definition) {
    return;
  }

  const validEntryIds = new Set(entries.map((entry) => entry.meta.id));
  const seenPresetKeys = new Set<string>();

  for (const preset of definition.presets) {
    if (!validEntryIds.has(preset.entryId)) {
      throw new Error(
        `Dev preset "${preset.id}" in "${basePath}" references unknown entry "${preset.entryId}".`,
      );
    }

    const presetKey = `${preset.entryId}:${preset.id}`;
    if (seenPresetKeys.has(presetKey)) {
      throw new Error(
        `Dev preset "${preset.id}" for "${preset.entryId}" is duplicated in "${basePath}".`,
      );
    }

    seenPresetKeys.add(presetKey);
  }
}

async function buildAutoPreset(
  entry: ModulesIndexEntry,
): Promise<ModuleDevPreset> {
  const module = await loadModuleDefinition(entry);

  return {
    entryId: entry.meta.id,
    id: "auto",
    name: "Auto",
    auto: true,
    config: resolveConfigDefaults(module.configSchema),
  };
}

async function buildDefinitionForBasePath(
  basePath: string,
  entries: ModulesIndexEntry[],
): Promise<ModuleDevDefinition> {
  const explicitDefinition = getDefinitionsByBasePath().get(basePath);
  validateExplicitDefinition(basePath, explicitDefinition, entries);

  const presets = [...(explicitDefinition?.presets ?? [])];

  for (const entry of entries) {
    const alreadyHasAutoPreset = presets.some(
      (preset) => preset.entryId === entry.meta.id && preset.id === "auto",
    );
    if (alreadyHasAutoPreset) {
      continue;
    }

    presets.push(await buildAutoPreset(entry));
  }

  return { presets };
}

function hasMockAdapter(basePath: string) {
  return Boolean(mockAdapterModules[`${basePath}/dev.mock.ts`]);
}

export async function loadModuleDevMockAdapter(basePath: string) {
  const loader = mockAdapterModules[`${basePath}/dev.mock.ts`];
  if (!loader) {
    return null;
  }

  const loaded = await loader();
  return loaded.default ?? null;
}

export async function loadModuleDevCatalog(): Promise<ModuleDevCatalogItem[]> {
  if (devCatalogPromise) {
    return devCatalogPromise;
  }

  devCatalogPromise = (async () => {
    const modules = await loadModulesIndex();
    const entriesByBasePath = new Map<string, ModulesIndexEntry[]>();

    for (const entry of modules) {
      const list = entriesByBasePath.get(entry.basePath) ?? [];
      list.push(entry);
      entriesByBasePath.set(entry.basePath, list);
    }

    const definitionsByBasePath = new Map<string, ModuleDevDefinition>();
    for (const [basePath, entries] of entriesByBasePath) {
      definitionsByBasePath.set(
        basePath,
        await buildDefinitionForBasePath(basePath, entries),
      );
    }

    return modules.map((entry) => {
      const definition = definitionsByBasePath.get(entry.basePath);
      if (!definition) {
        throw new Error(`Missing dev definition for "${entry.basePath}".`);
      }

      return {
        entry,
        definition,
        defaultPreset: getDefaultPreset(definition, entry.meta.id),
        presets: getPresetsForEntry(definition, entry.meta.id),
        hasMockAdapter: hasMockAdapter(entry.basePath),
      };
    });
  })().catch((error) => {
    devCatalogPromise = null;
    throw error;
  });

  return devCatalogPromise;
}

export async function loadModuleDevRuntimeEntry(
  entryId: string,
): Promise<ModuleDevRuntimeEntry> {
  const catalog = await loadModuleDevCatalog();
  const item = catalog.find((candidate) => candidate.entry.meta.id === entryId);

  if (!item) {
    throw new Error(`Module dev entry "${entryId}" was not found.`);
  }

  const module = await loadModuleDefinition(item.entry);

  return {
    entry: item.entry,
    module,
    definition: item.definition,
    defaultPreset: item.defaultPreset,
    presets: item.presets,
    hasMockAdapter: item.hasMockAdapter,
  };
}
