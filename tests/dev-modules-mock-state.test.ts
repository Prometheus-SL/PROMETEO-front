import { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  parseModuleDevMockStateText,
  resolveModuleDevMockState,
} from "../src/dev/modules/mock-state";
import type { ModuleDevMockAdapter } from "../src/dev/modules/types";

describe("dev modules mock state", () => {
  it("uses the adapter state schema to normalize partial JSON input", () => {
    const adapter: ModuleDevMockAdapter = {
      stateSchema: z.object({
        counter: z.number().default(0),
        enabled: z.boolean().default(true),
      }),
      apply: () => undefined,
    };

    const parsed = parseModuleDevMockStateText('{"counter": 3}', adapter, {});

    expect(parsed.error).toBeNull();
    expect(parsed.value).toEqual({
      counter: 3,
      enabled: true,
    });
  });

  it("falls back to the previous valid state when schema validation fails", () => {
    const adapter: ModuleDevMockAdapter = {
      stateSchema: z.object({
        counter: z.number().default(0),
        enabled: z.boolean().default(true),
      }),
      apply: () => undefined,
    };

    const parsed = parseModuleDevMockStateText('{"counter":"oops"}', adapter, {
      counter: 7,
      enabled: false,
    });

    expect(parsed.error).toMatch(/counter/i);
    expect(parsed.value).toEqual({
      counter: 7,
      enabled: false,
    });
  });

  it("resolves a safe initial state for adapters without a state schema", () => {
    const adapter: ModuleDevMockAdapter = {
      createInitialState: () => ({
        mode: "demo",
        retries: 1,
      }),
      apply: () => undefined,
    };

    expect(resolveModuleDevMockState(adapter)).toEqual({
      mode: "demo",
      retries: 1,
    });
  });
});
