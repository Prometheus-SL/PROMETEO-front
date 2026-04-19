import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function readModuleMock(relativePath: string) {
  return readFile(
    path.resolve(process.cwd(), relativePath),
    "utf8",
  );
}

describe("dev modules legacy msw adapters", () => {
  it("migrates spotify and discord adapters to the shared helper", async () => {
    const [spotify, discord] = await Promise.all([
      readModuleMock("modules/spotify-widget/dev.mock.ts"),
      readModuleMock("modules/discord-widget/dev.mock.ts"),
    ]);

    expect(spotify).toContain("createMswModuleDevMockAdapter");
    expect(discord).toContain("createMswModuleDevMockAdapter");
    expect(spotify).not.toContain('from "msw/browser"');
    expect(discord).not.toContain('from "msw/browser"');
    expect(spotify).not.toContain("setupWorker(");
    expect(discord).not.toContain("setupWorker(");
  });
});
