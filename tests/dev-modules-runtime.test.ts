import { describe, expect, it } from "vitest";

import {
  createModuleDevAuthValue,
  getModuleDevRoutePath,
  resolveModuleDevSurface,
} from "../src/dev/modules/runtime";

describe("dev modules runtime helpers", () => {
  it("normalizes unsupported surfaces back to dashboard", () => {
    expect(resolveModuleDevSurface("dashboard")).toBe("dashboard");
    expect(resolveModuleDevSurface("client")).toBe("client");
    expect(resolveModuleDevSurface("ops")).toBe("ops");
    expect(resolveModuleDevSurface("all")).toBe("dashboard");
    expect(resolveModuleDevSurface(undefined)).toBe("dashboard");
  });

  it("maps each preview surface to its emulated pathname", () => {
    expect(getModuleDevRoutePath("dashboard")).toBe("/dashboard/dev-preview");
    expect(getModuleDevRoutePath("client")).toBe("/client/dev-preview");
    expect(getModuleDevRoutePath("ops")).toBe("/ops/dev-preview");
    expect(getModuleDevRoutePath("dashboard", "/custom/path")).toBe(
      "/custom/path",
    );
  });

  it("creates a stable injected auth value for preview runtimes", async () => {
    const auth = createModuleDevAuthValue({
      role: "operator",
      user: {
        username: "sandbox-user",
      },
    });

    expect(auth.accessToken).toBe("dev-access-token");
    expect(auth.refreshToken).toBe("dev-refresh-token");
    expect(auth.user?.role).toBe("operator");
    expect(auth.user?.username).toBe("sandbox-user");
    expect(auth.user?.email).toBe("sandbox-user@prometeo.dev");
    await expect(auth.login("demo", "demo")).resolves.toBeUndefined();
  });
});
