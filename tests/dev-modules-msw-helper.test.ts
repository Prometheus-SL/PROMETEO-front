import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const workerMocks = vi.hoisted(() => {
  const start = vi.fn().mockResolvedValue(undefined);
  const use = vi.fn();
  const resetHandlers = vi.fn();
  const setupWorker = vi.fn(() => ({
    start,
    use,
    resetHandlers,
  }));

  return {
    resetHandlers,
    setupWorker,
    start,
    use,
  };
});

vi.mock("msw/browser", () => ({
  setupWorker: workerMocks.setupWorker,
}));

describe("dev modules msw helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates adapters that start msw once and reset handlers on cleanup", async () => {
    const buildHandlers = vi.fn((state: { counter: number }) => [
      { handler: state.counter },
    ]);

    const { createMswModuleDevMockAdapter } = await import(
      "../src/dev/modules/msw"
    );

    const adapter = createMswModuleDevMockAdapter({
      stateSchema: z.object({
        counter: z.number().default(1),
      }),
      buildHandlers,
    });

    expect(adapter.createInitialState?.()).toEqual({ counter: 1 });

    const originalState = { counter: 4 };
    await adapter.apply(originalState);
    originalState.counter = 99;
    await adapter.apply({ counter: 7 });
    await adapter.cleanup?.();

    expect(workerMocks.setupWorker).toHaveBeenCalledTimes(1);
    expect(workerMocks.start).toHaveBeenCalledWith({
      onUnhandledRequest: "bypass",
      quiet: true,
    });
    expect(buildHandlers).toHaveBeenNthCalledWith(1, { counter: 4 });
    expect(buildHandlers).toHaveBeenNthCalledWith(2, { counter: 7 });
    expect(workerMocks.use).toHaveBeenNthCalledWith(1, { handler: 4 });
    expect(workerMocks.use).toHaveBeenNthCalledWith(2, { handler: 7 });
    expect(workerMocks.resetHandlers).toHaveBeenCalledTimes(1);
  });
});
