import { describe, expect, it } from "vitest";

import adapter from "../modules/hermes-widget/dev.mock";

describe("hermes dev mock adapter", () => {
  it("exposes a state schema that can normalize partial state", () => {
    expect(adapter.stateSchema).toBeDefined();

    const parsed = adapter.stateSchema?.parse({
      agents: [],
    });

    expect(parsed).toMatchObject({
      agents: [],
      systemByAgentId: expect.any(Object),
      mediaByAgentId: expect.any(Object),
      commandResults: expect.any(Array),
    });
  });
});
