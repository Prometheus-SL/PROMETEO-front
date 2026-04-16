import { describe, expect, it, vi } from "vitest";

import type { ModuleDevMockAdapter } from "../src/dev/modules/types";

describe("dev modules mock-worker", () => {
    it("adapter apply is called with state", async () => {
        const apply = vi.fn().mockResolvedValue(undefined);
        const cleanup = vi.fn();

        const adapter: ModuleDevMockAdapter = { apply, cleanup };
        const state = { demo: true };

        await adapter.apply(state);

        expect(apply).toHaveBeenCalledWith({ demo: true });
    });

    it("adapter cleanup is callable", async () => {
        const cleanup = vi.fn();
        const adapter: ModuleDevMockAdapter = {
            apply: vi.fn().mockResolvedValue(undefined),
            cleanup,
        };

        await adapter.cleanup?.();

        expect(cleanup).toHaveBeenCalled();
    });

    it("adapter without cleanup does not throw", async () => {
        const adapter: ModuleDevMockAdapter = {
            apply: vi.fn().mockResolvedValue(undefined),
        };

        expect(() => adapter.cleanup?.()).not.toThrow();
    });

    it("adapter apply rejection is catchable", async () => {
        const adapter: ModuleDevMockAdapter = {
            apply: vi.fn().mockRejectedValue(new Error("mock setup failed")),
        };

        await expect(adapter.apply({})).rejects.toThrow("mock setup failed");
    });

    it("createInitialState produces default state", () => {
        const adapter: ModuleDevMockAdapter = {
            createInitialState: () => ({ counter: 0, active: true }),
            apply: vi.fn(),
        };

        expect(adapter.createInitialState?.()).toEqual({
            counter: 0,
            active: true,
        });
    });
});
