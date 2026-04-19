import type { ModulesIndexEntry } from "@/modules/types";

import { hasSharedMockAdapter } from "./mock-registry";
import type {
  ModuleDevDefinition,
  ModuleDevMockAdapterSource,
} from "./types";

export type ModuleDevSandboxResolution = {
  allowLiveRequests: boolean;
  hasMockAdapter: boolean;
  mockAdapterKey: string | null;
  mockAdapterSource: ModuleDevMockAdapterSource;
};

function collectRequiredProviders(entries: ModulesIndexEntry[]) {
  const providers = new Set<string>();

  for (const entry of entries) {
    for (const providerId of entry.meta.requiredProviders ?? []) {
      providers.add(providerId);
    }
  }

  return [...providers];
}

function inferSharedAdapterKey(entries: ModulesIndexEntry[]) {
  const providers = collectRequiredProviders(entries);

  if (providers.length !== 1) {
    return null;
  }

  const [providerId] = providers;
  if (!providerId || !hasSharedMockAdapter(providerId)) {
    return null;
  }

  return providerId;
}

export function resolveModuleDevSandbox(
  basePath: string,
  entries: ModulesIndexEntry[],
  definition: ModuleDevDefinition,
  hasLocalMockAdapter: boolean,
): ModuleDevSandboxResolution {
  const sandbox = definition.sandbox;
  const allowLiveRequests = Boolean(sandbox?.allowLiveRequests);

  if (hasLocalMockAdapter) {
    return {
      allowLiveRequests,
      hasMockAdapter: true,
      mockAdapterKey: null,
      mockAdapterSource: "local",
    };
  }

  if (sandbox?.adapterKey) {
    if (!hasSharedMockAdapter(sandbox.adapterKey)) {
      throw new Error(
        `Dev sandbox for "${basePath}" references unknown shared mock adapter "${sandbox.adapterKey}".`,
      );
    }

    return {
      allowLiveRequests,
      hasMockAdapter: true,
      mockAdapterKey: sandbox.adapterKey,
      mockAdapterSource: "shared",
    };
  }

  const inferredAdapterKey = inferSharedAdapterKey(entries);
  if (inferredAdapterKey) {
    return {
      allowLiveRequests,
      hasMockAdapter: true,
      mockAdapterKey: inferredAdapterKey,
      mockAdapterSource: "shared",
    };
  }

  const requiredProviders = collectRequiredProviders(entries);
  if (requiredProviders.length > 0 && !allowLiveRequests) {
    const entryIds = entries.map((entry) => entry.meta.id).join(", ");
    throw new Error(
      `Provider-backed dev module "${entryIds}" in "${basePath}" needs a local dev.mock.ts, a shared mock adapter, or sandbox.allowLiveRequests.`,
    );
  }

  return {
    allowLiveRequests,
    hasMockAdapter: false,
    mockAdapterKey: null,
    mockAdapterSource: null,
  };
}
