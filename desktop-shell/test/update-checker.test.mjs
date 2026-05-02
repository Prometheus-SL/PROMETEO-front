import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    compareVersions,
    isUpdateAvailable,
    shouldCheckForUpdates,
} from "../src/update-checker.mjs";

describe("update-checker helpers", () => {
    it("determines if enough time has passed since last check", () => {
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const oneHourAgo = now - 60 * 60 * 1000;

        assert.equal(
            shouldCheckForUpdates({ lastUpdateCheckTime: oneDayAgo }),
            true,
        );

        assert.equal(
            shouldCheckForUpdates({ lastUpdateCheckTime: oneHourAgo }),
            false,
        );

        assert.equal(shouldCheckForUpdates({}), true);
    });

    it("compares semantic versions correctly", () => {
        assert.equal(compareVersions("1.0.0", "1.1.0"), 1); // latest is newer
        assert.equal(compareVersions("1.1.0", "1.0.0"), -1); // current is newer
        assert.equal(compareVersions("1.0.0", "1.0.0"), 0); // equal
        assert.equal(compareVersions("0.4.0", "0.5.0"), 1);
        assert.equal(compareVersions("1.0.0", "2.0.0"), 1);
        assert.equal(compareVersions("2.0.0", "1.9.9"), -1);
    });

    it("detects when an update is available", () => {
        assert.equal(isUpdateAvailable("0.4.0", "0.5.0"), true);
        assert.equal(isUpdateAvailable("0.5.0", "0.5.0"), false);
        assert.equal(isUpdateAvailable("0.5.0", "0.4.0"), false);
        assert.equal(isUpdateAvailable("1.0.0", "1.0.1"), true);
    });
});
