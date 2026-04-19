// @vitest-environment jsdom

import React, { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ModuleDevCatalogItem,
  ModuleDevMockAdapter,
} from "../src/dev/modules";

const devModuleMocks = vi.hoisted(() => ({
  loadCatalog: vi.fn<() => Promise<ModuleDevCatalogItem[]>>(),
  loadMockAdapter: vi.fn<() => Promise<ModuleDevMockAdapter | null>>(),
  runtimeUnmounts: vi.fn(),
}));

const loaderMocks = vi.hoisted(() => ({
  loadModuleDefinition: vi.fn(),
}));

vi.mock("@/dev/modules", async () => {
  const session = await vi.importActual<typeof import("../src/dev/modules/session")>(
    "../src/dev/modules/session",
  );
  const mockWorker = await vi.importActual<
    typeof import("../src/dev/modules/mock-worker")
  >(
    "../src/dev/modules/mock-worker",
  );
  const mockState = await vi.importActual<
    typeof import("../src/dev/modules/mock-state")
  >(
    "../src/dev/modules/mock-state",
  );

  function RuntimeStub(props: Record<string, unknown>) {
    useEffect(() => {
      return () => {
        devModuleMocks.runtimeUnmounts();
      };
    }, []);

    return (
      <div
        data-entry-id={String(props.entryId)}
        data-runtime-config={JSON.stringify(props.config)}
      >
        Runtime
      </div>
    );
  }

  return {
    MODULE_DEV_SESSION_STORAGE_KEY: session.MODULE_DEV_SESSION_STORAGE_KEY,
    loadModuleDevCatalog: devModuleMocks.loadCatalog,
    loadModuleDevMockAdapter: devModuleMocks.loadMockAdapter,
    createDefaultModuleDevSession: session.createDefaultModuleDevSession,
    restoreModuleDevSession: session.restoreModuleDevSession,
    serializeModuleDevSession: session.serializeModuleDevSession,
    parseModuleDevMockStateText: mockState.parseModuleDevMockStateText,
    resolveModuleDevMockState: mockState.resolveModuleDevMockState,
    useModuleDevMocks: mockWorker.useModuleDevMocks,
    ModuleDevRuntime: RuntimeStub,
    MODULE_DEV_SURFACE_STYLES: {
      dashboard: "",
      client: "",
      ops: "",
    },
  };
});

vi.mock("@/dev/modules/SchemaForm", () => ({
  SchemaForm: () => <div data-schema-form="true" />,
}));

vi.mock("@/modules/loader", () => ({
  loadModuleDefinition: loaderMocks.loadModuleDefinition,
}));

function createCatalogItem(
  id: string,
  hasMockAdapter = true,
): ModuleDevCatalogItem {
  return {
    entry: {
      basePath: `/modules/${id}`,
      meta: {
        id,
        name: id,
        entry: "./index.tsx",
        size: { width: 2, height: 2 },
      },
      importers: {
        entry: async () => ({ default: () => null }),
      },
    },
    definition: {
      presets: [
        {
          entryId: id,
          id: "default",
          name: "Default",
          config: {},
        },
      ],
    },
    defaultPreset: {
      entryId: id,
      id: "default",
      name: "Default",
      config: {},
    },
    presets: [
      {
        entryId: id,
        id: "default",
        name: "Default",
        config: {},
      },
    ],
    hasMockAdapter,
    mockAdapterKey: hasMockAdapter ? null : null,
    mockAdapterSource: hasMockAdapter ? "local" : null,
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function settlePage() {
  await act(async () => {
    await flushMicrotasks();
  });
}

function getButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;
}

function getMockTextarea() {
  return document.querySelector("textarea") as HTMLTextAreaElement | null;
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("DevModulesPage", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    loaderMocks.loadModuleDefinition.mockResolvedValue({
      Component: () => null,
      configSchema: undefined,
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
        await flushMicrotasks();
      });
    }

    container?.remove();
    root = null;
    container = null;
  });

  it("restores persisted mock text through the adapter schema and resets to the adapter initial state", async () => {
    const adapter: ModuleDevMockAdapter = {
      stateSchema: z.object({
        counter: z.number().default(0),
        enabled: z.boolean().default(true),
      }),
      createInitialState: () => ({
        counter: 0,
        enabled: true,
      }),
      apply: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    devModuleMocks.loadCatalog.mockResolvedValue([
      createCatalogItem("spotify-widget"),
    ]);
    devModuleMocks.loadMockAdapter.mockResolvedValue(adapter);

    window.localStorage.setItem(
      "prometeo-dev-modules-session",
      JSON.stringify({
        selectedEntryId: "spotify-widget",
        mockTextByEntry: {
          "spotify-widget": '{"counter":5}',
        },
      }),
    );

    const { default: DevModulesPage } = await import("../src/pages/DevModulesPage");

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<DevModulesPage />);
      await flushMicrotasks();
    });

    await settlePage();

    expect(adapter.apply).toHaveBeenLastCalledWith({
      counter: 5,
      enabled: true,
    });

    const textarea = getMockTextarea();
    expect(textarea?.value).toContain('"counter": 5');
    expect(textarea?.value).toContain('"enabled": true');

    await act(async () => {
      getButton("Reset preset")?.click();
      await flushMicrotasks();
    });

    expect(adapter.apply).toHaveBeenLastCalledWith({
      counter: 0,
      enabled: true,
    });
    expect(textarea?.value).toContain('"counter": 0');
    expect(textarea?.value).toContain('"enabled": true');
  });

  it("reapplies valid mock edits without unmounting the runtime and blocks invalid schema input", async () => {
    const adapter: ModuleDevMockAdapter = {
      stateSchema: z.object({
        counter: z.number().default(0),
        enabled: z.boolean().default(true),
      }),
      createInitialState: () => ({
        counter: 0,
        enabled: true,
      }),
      apply: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    devModuleMocks.loadCatalog.mockResolvedValue([
      createCatalogItem("spotify-widget"),
    ]);
    devModuleMocks.loadMockAdapter.mockResolvedValue(adapter);

    const { default: DevModulesPage } = await import("../src/pages/DevModulesPage");

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<DevModulesPage />);
      await flushMicrotasks();
    });

    await settlePage();
    devModuleMocks.runtimeUnmounts.mockClear();

    const textarea = getMockTextarea();
    expect(textarea).not.toBeNull();

    await act(async () => {
      if (textarea) {
        setTextareaValue(textarea, '{"counter":8}');
      }
      await flushMicrotasks();
    });

    expect(adapter.apply).toHaveBeenLastCalledWith({
      counter: 8,
      enabled: true,
    });
    expect(devModuleMocks.runtimeUnmounts).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Starting local mocks");

    const applyCallsAfterValidEdit = adapter.apply.mock.calls.length;

    await act(async () => {
      if (textarea) {
        setTextareaValue(textarea, '{"counter":"oops"}');
      }
      await flushMicrotasks();
    });

    expect(document.body.textContent).toContain("counter");
    expect(adapter.apply).toHaveBeenCalledTimes(applyCallsAfterValidEdit);
    expect(devModuleMocks.runtimeUnmounts).not.toHaveBeenCalled();
  });

  it("does not mount the runtime before the current entry mock adapter finishes loading", async () => {
    const deferredAdapter = createDeferred<ModuleDevMockAdapter | null>();

    devModuleMocks.loadCatalog.mockResolvedValue([
      createCatalogItem("spotify-widget"),
    ]);
    devModuleMocks.loadMockAdapter.mockReturnValue(deferredAdapter.promise);

    const { default: DevModulesPage } = await import("../src/pages/DevModulesPage");

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<DevModulesPage />);
      await flushMicrotasks();
    });

    expect(document.body.textContent).toContain("Starting local mocks");
    expect(document.body.textContent).not.toContain("Runtime");

    const adapter: ModuleDevMockAdapter = {
      stateSchema: z.object({
        counter: z.number().default(0),
      }),
      createInitialState: () => ({ counter: 0 }),
      apply: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined),
    };

    await act(async () => {
      deferredAdapter.resolve(adapter);
      await flushMicrotasks();
    });

    expect(document.body.textContent).toContain("Runtime");
    expect(adapter.apply).toHaveBeenLastCalledWith({ counter: 0 });
  });
});
