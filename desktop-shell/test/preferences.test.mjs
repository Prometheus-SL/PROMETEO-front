import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import {
    getPreferencesPath,
    loadPreferences,
    savePreferences,
} from "../src/preferences.mjs";

const tempDirs = [];

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })),
    );
});

describe("preferences helpers", () => {
    it("returns defaults when the preferences file does not exist", async () => {
        const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "prometeo-preferences-"));
        tempDirs.push(userDataPath);

        const preferences = await loadPreferences({ userDataPath });

        assert.deepEqual(preferences, {
            suppressAutostartPrompt: false,
            lastUpdateCheckTime: 0,
        });
    });

    it("persists preferences in the user data directory", async () => {
        const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "prometeo-preferences-"));
        tempDirs.push(userDataPath);

        const savedPreferences = await savePreferences({
            userDataPath,
            preferences: {
                suppressAutostartPrompt: true,
            },
        });

        assert.deepEqual(savedPreferences, {
            suppressAutostartPrompt: true,
            lastUpdateCheckTime: 0,
        });
        assert.equal(await loadPreferences({ userDataPath }).then(data => data.suppressAutostartPrompt), true);
        assert.equal(
            getPreferencesPath(userDataPath),
            path.join(userDataPath, "preferences.json"),
        );
    });
});
