import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createBrowserWindowOptions } from "../src/window-options.mjs";

describe("createBrowserWindowOptions", () => {
  const displayBounds = {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  };

  it("sizes kiosk windows to the current display bounds", () => {
    const options = createBrowserWindowOptions({
      displayBounds,
      isKiosk: true,
      devToolsEnabled: false,
      iconPath: "icon.png",
    });

    assert.equal(options.x, 0);
    assert.equal(options.y, 0);
    assert.equal(options.width, 1920);
    assert.equal(options.height, 1080);
    assert.equal(options.fullscreen, true);
    assert.equal(options.kiosk, true);
    assert.equal(options.resizable, false);
  });

  it("keeps non-kiosk windows resizable without forcing display bounds", () => {
    const options = createBrowserWindowOptions({
      displayBounds,
      isKiosk: false,
      devToolsEnabled: true,
      iconPath: "icon.png",
    });

    assert.equal(options.width, undefined);
    assert.equal(options.height, undefined);
    assert.equal(options.fullscreen, false);
    assert.equal(options.kiosk, false);
    assert.equal(options.resizable, true);
    assert.equal(options.webPreferences.devTools, true);
  });
});
