// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Particles } from "../src/components/ui/shadcn-io/particles";

type Context2DStub = Pick<
  CanvasRenderingContext2D,
  | "scale"
  | "translate"
  | "beginPath"
  | "arc"
  | "fill"
  | "setTransform"
  | "clearRect"
> & {
  fillStyle: string;
};

function createContextStub(): Context2DStub {
  return {
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillStyle: "",
  };
}

describe("Particles", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null;
  let requestAnimationFrameMock: ReturnType<typeof vi.fn>;
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  beforeEach(() => {
    root = null;
    container = document.createElement("div");
    document.body.appendChild(container);

    const context = createContextStub();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as CanvasRenderingContext2D,
    );

    requestAnimationFrameMock = vi.fn(() => 1);
    cancelAnimationFrameMock = vi.fn();

    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: requestAnimationFrameMock,
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: cancelAnimationFrameMock,
    });
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      writable: true,
      value: 2,
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }

    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  async function renderParticles(props: Record<string, unknown> = {}) {
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <div style={{ width: 240, height: 120 }}>
          <Particles className="h-[120px] w-[240px]" {...(props as never)} />
        </div>,
      );
    });
  }

  it("does not start the animation loop when rendered as inactive", async () => {
    await renderParticles({ active: false });

    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it("cancels the scheduled animation frame when unmounted", async () => {
    await renderParticles({ active: true });

    expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      root?.unmount();
      root = null;
    });

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);
  });
});
