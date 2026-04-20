import { describe, expect, it } from "vitest";

import { createAppRoutes } from "../src/routes";

describe("app routes", () => {
  it("adds /dev/modules only in development mode", () => {
    const devRoutes = createAppRoutes(true);
    const prodRoutes = createAppRoutes(false);

    expect(devRoutes.some((route) => route.path === "/dev/modules")).toBe(true);
    expect(prodRoutes.some((route) => route.path === "/dev/modules")).toBe(false);
  });

  it("exposes password recovery as a public auth route", () => {
    const routes = createAppRoutes(false);

    expect(routes.some((route) => route.path === "/forgot-password")).toBe(true);
  });
});
