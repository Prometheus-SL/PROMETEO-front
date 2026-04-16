import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AuthProvider,
  type AuthContextValue,
  useAuthContext,
} from "../src/providers/AuthProvider";

function AuthSnapshot() {
  const context = useAuthContext();

  return (
    <pre>
      {JSON.stringify({
        accessToken: context.accessToken,
        user: context.user,
      })}
    </pre>
  );
}

describe("AuthProvider", () => {
  it("accepts an injected auth value for local preview runtimes", () => {
    const html = renderToStaticMarkup(
      <AuthProvider
        value={
          {
            accessToken: "dev-access-token",
            refreshToken: "dev-refresh-token",
            user: {
              id: "dev-user",
              username: "migue",
              email: "miguel@example.com",
              role: "admin",
              name: "Miguel",
              surname: "Demo",
            },
            login: async () => undefined,
            loginQR: async () => undefined,
            logout: () => undefined,
            register: async () => undefined,
            loading: false,
            error: null,
            clearError: () => undefined,
          } satisfies AuthContextValue
        }
      >
        <AuthSnapshot />
      </AuthProvider>,
    );

    expect(html).toContain("dev-access-token");
    expect(html).toContain("&quot;role&quot;:&quot;admin&quot;");
  });
});
