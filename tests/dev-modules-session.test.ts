import { describe, expect, it } from "vitest";

import {
  createDefaultModuleDevSession,
  restoreModuleDevSession,
} from "../src/dev/modules/session";

describe("dev modules session", () => {
  it("creates a sensible default local sandbox session", () => {
    expect(createDefaultModuleDevSession("spotify-widget")).toEqual({
      selectedEntryId: "spotify-widget",
      presetId: null,
      surface: "dashboard",
      theme: "system",
      role: "admin",
      canvasMode: "fit",
      persist: true,
      configTextByEntry: {},
      sharedTextByEntry: {},
      mockTextByEntry: {},
      actionsTextByEntry: {},
    });
  });

  it("merges persisted values over the sandbox defaults", () => {
    const session = restoreModuleDevSession(
      JSON.stringify({
        selectedEntryId: "wled-controller",
        presetId: "device-online",
        surface: "ops",
        theme: "dark",
        role: "operator",
        canvasMode: "actual",
        configTextByEntry: {
          "wled-controller": '{"deviceIp":"192.168.1.55"}',
        },
      }),
      "spotify-widget",
    );

    expect(session.selectedEntryId).toBe("wled-controller");
    expect(session.presetId).toBe("device-online");
    expect(session.surface).toBe("ops");
    expect(session.theme).toBe("dark");
    expect(session.role).toBe("operator");
    expect(session.canvasMode).toBe("actual");
    expect(session.configTextByEntry["wled-controller"]).toContain(
      "192.168.1.55",
    );
  });

  it("falls back safely when persisted data is invalid", () => {
    expect(restoreModuleDevSession("not-json", "weather-widget")).toEqual(
      createDefaultModuleDevSession("weather-widget"),
    );
  });
});
