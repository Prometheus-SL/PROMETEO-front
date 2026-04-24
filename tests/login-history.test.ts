import { describe, expect, it } from "vitest";

import { getLoginHistoryPresentation } from "../src/components/account/login-history.helpers";

describe("login history helpers", () => {
  it("renders provider sign-ins with a readable provider title", () => {
    const presentation = getLoginHistoryPresentation({
      _id: "history-1",
      method: "oauth",
      provider: "github",
      success: true,
      createdAt: "2026-04-24T08:00:00.000Z",
    });

    expect(presentation.title).toBe("GitHub provider sign-in");
    expect(presentation.channelLabel).toBe("OAuth");
  });

  it("maps second-factor failures to a specific explanation", () => {
    const presentation = getLoginHistoryPresentation({
      _id: "history-2",
      method: "password",
      success: false,
      failureReason: "INVALID_TOTP_TOKEN",
      createdAt: "2026-04-24T08:05:00.000Z",
    });

    expect(presentation.title).toBe("Two-factor verification");
    expect(presentation.failureLabel).toBe(
      "The verification code or recovery code was not valid.",
    );
  });

  it("supports legacy oauth method values that already embed the provider", () => {
    const presentation = getLoginHistoryPresentation({
      _id: "history-3",
      method: "oauth:discord",
      success: false,
      failureReason: "ACCESS_DENIED",
      createdAt: "2026-04-24T08:10:00.000Z",
    });

    expect(presentation.title).toBe("Discord provider sign-in");
    expect(presentation.channelLabel).toBe("OAuth");
    expect(presentation.failureLabel).toBe("Access denied.");
  });
});
