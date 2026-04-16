import { describe, expect, it } from "vitest";

import { createAppRoutes } from "../src/routes";

describe("app routes", () => {
  it("adds /dev/modules only in development mode", () => {
    const devRoutes = createAppRoutes(true);
    const prodRoutes = createAppRoutes(false);

    expect(devRoutes.some((route) => route.path === "/dev/modules")).toBe(true);
    expect(prodRoutes.some((route) => route.path === "/dev/modules")).toBe(false);
  });
});
