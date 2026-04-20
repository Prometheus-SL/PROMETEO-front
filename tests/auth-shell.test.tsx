import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  AuthShell,
  PROMETEO_LANDING_URL,
} from "../src/components/auth/AuthShell";

describe("AuthShell", () => {
  it("renders a shared landing link for public authentication pages", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthShell
          title="Welcome back"
          description="Sign in to continue to Prometeo."
          eyebrow="Secure access"
        >
          <div>Auth content</div>
        </AuthShell>
      </MemoryRouter>,
    );

    expect(html).toContain(`href="${PROMETEO_LANDING_URL}"`);
    expect(html).toContain("Landing");
    expect(html).toContain("Auth content");
  });
});
