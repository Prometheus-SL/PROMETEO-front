import { vi } from "vitest";

type LocalStorageMock = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

export function installTestEnvironment(pathname = "/login") {
  const storage = new Map<string, string>();

  const localStorageMock: LocalStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  };

  const fetchMock = vi.fn();
  const replace = vi.fn();
  const windowMock = {
    location: {
      pathname,
      replace,
    },
  };

  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("window", windowMock);

  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });

  return {
    fetchMock,
    localStorageMock,
    replace,
    storage,
    windowMock,
  };
}
