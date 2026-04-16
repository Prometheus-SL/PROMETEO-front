import React, { useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SharedContext } from "../src/contexts/SharedContext";
import { SharedContextProvider } from "../src/providers/SharedContextProvider";

function SharedContextSnapshot() {
  const context = useContext(SharedContext);
  if (!context) {
    throw new Error("SharedContextSnapshot requires SharedContextProvider");
  }

  const payload = {
    shared: context.getAll(),
    actionIds: context.getActions().map((action) => action.id),
  };

  return <pre>{JSON.stringify(payload)}</pre>;
}

function decodePreJson(html: string) {
  return html
    .replace("<pre>", "")
    .replace("</pre>", "")
    .replaceAll("&quot;", '"');
}

describe("SharedContextProvider", () => {
  it("seeds initial shared data and actions for Storybook stories", () => {
    const html = renderToStaticMarkup(
      <SharedContextProvider
        initialSharedData={{
          "media.session": { title: "Nightcall", source: "spotify" },
          "dashboard.surface": "ops",
        }}
        initialActions={[
          {
            id: "spotify-widget:play-pause",
            title: "Play / Pause",
            widgetId: "spotify-widget",
            run: () => ({ success: true }),
          },
        ]}
      >
        <SharedContextSnapshot />
      </SharedContextProvider>,
    );

    const payload = decodePreJson(html);

    expect(payload).toContain('"dashboard.surface":"ops"');
    expect(payload).toContain('"spotify-widget:play-pause"');
    expect(payload).toContain('"Nightcall"');
  });

  it("renders safely without browser localStorage when no seed is provided", () => {
    const html = renderToStaticMarkup(
      <SharedContextProvider>
        <SharedContextSnapshot />
      </SharedContextProvider>,
    );

    const payload = decodePreJson(html);

    expect(payload).toContain('"shared":{}');
    expect(payload).toContain('"actionIds":[]');
  });
});
