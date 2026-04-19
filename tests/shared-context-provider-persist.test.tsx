// @vitest-environment jsdom

import React, { act, useContext, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SharedContext } from "../src/contexts/SharedContext";
import { SharedContextProvider } from "../src/providers/SharedContextProvider";

const STORAGE_KEY = "prometeo-shared-context";

function SharedWriter() {
  const context = useContext(SharedContext);
  if (!context) {
    throw new Error("SharedWriter requires SharedContextProvider");
  }

  useEffect(() => {
    context.setShared("preview.draft", { title: "Draft" });
  }, [context]);

  return null;
}

describe("SharedContextProvider persistence", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }

    container?.remove();
    root = null;
    container = null;
  });

  it("does not write preview-only shared state to localStorage when persistence is disabled", async () => {
    root = createRoot(container!);

    await act(async () => {
      root!.render(
        <SharedContextProvider persist={false}>
          <SharedWriter />
        </SharedContextProvider>,
      );
    });

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
