import {
  loadModuleConfigSchema,
  loadModuleDefinition,
  loadModulesIndex,
} from "@/modules/loader";
import type { ModuleDefinition, ModulesIndexEntry } from "@/modules/types";

import {
  getDefaultPreset,
  getPresetsForEntry,
  resolveConfigDefaults,
} from "./helpers";
import { loadSharedMockAdapter } from "./mock-registry";
import { resolveModuleDevSandbox } from "./sandbox";
import type {
  ModuleDevDefinition,
  ModuleDevMockAdapter,
  ModuleDevMockAdapterSource,
  ModuleDevPreset,
} from "./types";

export type ModuleDevCatalogItem = {
  entry: ModulesIndexEntry;
  definition: ModuleDevDefinition;
  defaultPreset: ModuleDevPreset;
  presets: ModuleDevPreset[];
  hasMockAdapter: boolean;
  mockAdapterKey: string | null;
  mockAdapterSource: ModuleDevMockAdapterSource;
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
  const configSchema = await loadModuleConfigSchema(entry);

  return {
    entryId: entry.meta.id,
    id: "auto",
    name: "Auto",
    auto: true,
    config: resolveConfigDefaults(configSchema),
  };
}

async function buildDefinitionForBasePath(
  basePath: string,
  entries: ModulesIndexEntry[],
): Promise<ModuleDevDefinition> {
  const explicitDefinition = getDefinitionsByBasePath().get(basePath);
  validateExplicitDefinition(basePath, explicitDefinition, entries);

  const presets = [...(explicitDefinition?.presets ?? [])];
  const missingAutoPresetEntries = entries.filter((entry) => {
    return !presets.some(
      (preset) => preset.entryId === entry.meta.id && preset.id === "auto",
    );
  });

  presets.push(...(await Promise.all(missingAutoPresetEntries.map(buildAutoPreset))));

  return {
    presets,
    sandbox: explicitDefinition?.sandbox,
  };
}

function hasLocalMockAdapter(basePath: string) {
  return Boolean(mockAdapterModules[`${basePath}/dev.mock.ts`]);
}

export async function loadModuleDevMockAdapter(basePath: string) {
  const loader = mockAdapterModules[`${basePath}/dev.mock.ts`];
  if (loader) {
    const loaded = await loader();
    return loaded.default ?? null;
  }

  const catalog = await loadModuleDevCatalog();
  const item = catalog.find((candidate) => candidate.entry.basePath === basePath);

  if (!item?.mockAdapterKey || item.mockAdapterSource !== "shared") {
    return null;
  }

  return loadSharedMockAdapter(item.mockAdapterKey);
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
    const sandboxByBasePath = new Map<
      string,
      ReturnType<typeof resolveModuleDevSandbox>
    >();
    for (const [basePath, entries] of entriesByBasePath) {
      const definition = await buildDefinitionForBasePath(basePath, entries);
      definitionsByBasePath.set(basePath, definition);
      sandboxByBasePath.set(
        basePath,
        resolveModuleDevSandbox(
          basePath,
          entries,
          definition,
          hasLocalMockAdapter(basePath),
        ),
      );
    }

    return modules.map((entry) => {
      const definition = definitionsByBasePath.get(entry.basePath);
      const sandbox = sandboxByBasePath.get(entry.basePath);
      if (!definition) {
        throw new Error(`Missing dev definition for "${entry.basePath}".`);
      }
      if (!sandbox) {
        throw new Error(`Missing dev sandbox resolution for "${entry.basePath}".`);
      }

      return {
        entry,
        definition,
        defaultPreset: getDefaultPreset(definition, entry.meta.id),
        presets: getPresetsForEntry(definition, entry.meta.id),
        hasMockAdapter: sandbox.hasMockAdapter,
        mockAdapterKey: sandbox.mockAdapterKey,
        mockAdapterSource: sandbox.mockAdapterSource,
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
