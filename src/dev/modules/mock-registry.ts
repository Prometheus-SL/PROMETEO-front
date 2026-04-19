import type { ModuleDevMockAdapter } from "./types";

const sharedMockAdapterModules: Record<
  string,
  () => Promise<ModuleDevMockAdapter>
> = {
  github: async () =>
    (await import("./shared-mocks/github"))
      .default as unknown as ModuleDevMockAdapter,
  google: async () =>
    (await import("./shared-mocks/google"))
      .default as unknown as ModuleDevMockAdapter,
};

export function hasSharedMockAdapter(key: string) {
  return key in sharedMockAdapterModules;
}

export function listSharedMockAdapterKeys() {
  return Object.keys(sharedMockAdapterModules);
}

export async function loadSharedMockAdapter(key: string) {
  const loader = sharedMockAdapterModules[key];
  if (!loader) {
    return null;
  }

  return loader();
}
