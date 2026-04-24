import { describe, expect, it } from "vitest";

import { getSessionPresentation } from "../src/components/account/sessions.helpers";

describe("session presentation helpers", () => {
  it("derives a desktop browser label from the user agent", () => {
    const presentation = getSessionPresentation({
      sessionId: "session-1",
      createdAt: "2026-04-24T10:00:00.000Z",
      current: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      ip: "::1",
    });

    expect(presentation.deviceType).toBe("desktop");
    expect(presentation.deviceLabel).toBe("Desktop device");
    expect(presentation.primaryLabel).toBe("Chrome on Windows");
    expect(presentation.networkLabel).toBe("This device");
  });

  it("detects mobile sessions and preserves a usable remote ip hint", () => {
    const presentation = getSessionPresentation({
      sessionId: "session-2",
      createdAt: "2026-04-24T10:00:00.000Z",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1",
      ip: "203.0.113.25",
    });

    expect(presentation.deviceType).toBe("mobile");
    expect(presentation.deviceLabel).toBe("Mobile device");
    expect(presentation.primaryLabel).toBe("Safari on iPhone");
    expect(presentation.networkLabel).toBe("IP 203.0.113.25");
  });

  it("falls back gracefully when the user agent is missing", () => {
    const presentation = getSessionPresentation({
      sessionId: "session-3",
      createdAt: "2026-04-24T10:00:00.000Z",
    });

    expect(presentation.deviceType).toBe("unknown");
    expect(presentation.primaryLabel).toBe("Unknown device");
    expect(presentation.secondaryLabel).toBe("Browser and operating system unavailable");
  });
});
