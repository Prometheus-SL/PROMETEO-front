// @vitest-environment jsdom

import React, { StrictMode, act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  useModuleDevMocks,
  type MockLayerState,
} from "../src/dev/modules/mock-worker";
import type { ModuleDevMockAdapter } from "../src/dev/modules/types";

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function HookProbe({
  adapter,
  adapterState,
  onLayer,
}: {
  adapter: ModuleDevMockAdapter | null;
  adapterState: Record<string, unknown>;
  onLayer: (layer: MockLayerState) => void;
}) {
  const layer = useModuleDevMocks(adapter, adapterState);

  useEffect(() => {
    onLayer(layer);
  }, [layer, onLayer]);

  return null;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("dev modules mock-worker hook", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

  it("does not reset the adapter while a newer mock state is waiting behind an in-flight apply", async () => {
    const deferredByVersion = new Map<number, ReturnType<typeof createDeferred>>();
    let activeVersion = 0;
    const cleanup = vi.fn().mockResolvedValue(undefined);

    const adapter: ModuleDevMockAdapter = {
      cleanup,
      apply: vi.fn().mockImplementation(async (state) => {
        const version = Number(state.version);
        const deferred = createDeferred();
        deferredByVersion.set(version, deferred);
        await deferred.promise;
        activeVersion = version;
      }),
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <HookProbe
          adapter={adapter}
          adapterState={{ version: 1 }}
          onLayer={() => undefined}
        />,
      );
      await flushMicrotasks();
    });

    await act(async () => {
      root.render(
        <HookProbe
          adapter={adapter}
          adapterState={{ version: 2 }}
          onLayer={() => undefined}
        />,
      );
      await flushMicrotasks();
    });

    expect(cleanup).not.toHaveBeenCalled();

    await act(async () => {
      deferredByVersion.get(1)?.resolve();
      await flushMicrotasks();
    });

    expect(deferredByVersion.has(2)).toBe(true);

    await act(async () => {
      deferredByVersion.get(2)?.resolve();
      await flushMicrotasks();
    });

    expect(activeVersion).toBe(2);
  });

  it("does not drop back to loading when reapplying the same adapter after the first ready state", async () => {
    const layers: MockLayerState[] = [];
    const adapter: ModuleDevMockAdapter = {
      cleanup: vi.fn().mockResolvedValue(undefined),
      apply: vi.fn().mockResolvedValue(undefined),
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <HookProbe
          adapter={adapter}
          adapterState={{ version: 1 }}
          onLayer={(layer) => {
            layers.push(layer);
          }}
        />,
      );
      await flushMicrotasks();
    });

    expect(layers.at(-1)).toEqual({ ready: true, error: null });

    const readyIndex = layers.findIndex((layer) => layer.ready);

    await act(async () => {
      root.render(
        <HookProbe
          adapter={adapter}
          adapterState={{ version: 2 }}
          onLayer={(layer) => {
            layers.push(layer);
          }}
        />,
      );
      await flushMicrotasks();
    });

    expect(
      layers.slice(readyIndex + 1).some((layer) => !layer.ready && !layer.error),
    ).toBe(false);
    expect(layers.at(-1)).toEqual({ ready: true, error: null });
  });

  it("reaches ready state under React StrictMode double-invocation", async () => {
    const layers: MockLayerState[] = [];
    const adapter: ModuleDevMockAdapter = {
      cleanup: vi.fn().mockResolvedValue(undefined),
      apply: vi.fn().mockResolvedValue(undefined),
    };

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <StrictMode>
          <HookProbe
            adapter={adapter}
            adapterState={{ version: 1 }}
            onLayer={(layer) => {
              layers.push(layer);
            }}
          />
        </StrictMode>,
      );
      await flushMicrotasks();
    });

    expect(layers.at(-1)).toEqual({ ready: true, error: null });
  });
});
