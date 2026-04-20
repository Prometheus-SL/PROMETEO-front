import { describe, expect, it } from "vitest";

import {
  readOAuthCallbackPayload,
  shouldCompleteOAuthLocally,
} from "../src/pages/OAuthCallbackPage";

describe("OAuthCallbackPage helpers", () => {
  it("reads token payload from the URL fragment before the query string", () => {
    const payload = readOAuthCallbackPayload(
      "?status=error&accessToken=query-token",
      "#status=success&accessToken=access&refreshToken=refresh&sessionId=session",
    );

    expect(payload).toEqual({
      status: "success",
      error: "",
      accessToken: "access",
      refreshToken: "refresh",
      sessionId: "session",
    });
  });

  it("completes successful callbacks locally only when login page does not acknowledge them", () => {
    const payload = {
      status: "success" as const,
      error: "",
      accessToken: "access",
      refreshToken: "refresh",
      sessionId: "session",
    };

    expect(shouldCompleteOAuthLocally(payload, false)).toBe(true);
    expect(shouldCompleteOAuthLocally(payload, true)).toBe(false);
    expect(
      shouldCompleteOAuthLocally({ ...payload, refreshToken: "" }, false),
    ).toBe(false);
  });
});
