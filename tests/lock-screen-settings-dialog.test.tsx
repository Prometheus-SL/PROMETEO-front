// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LockScreenSettingsPanel } from "../src/components/dashboard/lock-screen-settings-dialog";
import { DEFAULT_LOCK_SCREEN_CONFIG } from "../src/layouts/lock-screen-config";

describe("LockScreenSettingsPanel", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(window, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverMock,
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverMock,
    });

    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }

    document.body.innerHTML = "";
    container = null;
    root = null;
  });

  it("renders outside SharedContextProvider", async () => {
    root = createRoot(container!);

    await expect(
      act(async () => {
        root!.render(
          <LockScreenSettingsPanel
            initialConfig={DEFAULT_LOCK_SCREEN_CONFIG}
            onSave={vi.fn(async () => undefined)}
          />,
        );
      }),
    ).resolves.toBeUndefined();

    expect(document.body.textContent).toContain("Lock screen");
  });
});
