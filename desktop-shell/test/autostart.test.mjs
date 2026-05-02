import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import {
    AUTOSTART_DESKTOP_FILE,
    buildDesktopEntry,
    buildDesktopExec,
    disableAutostart,
    enableAutostart,
    getAutostartDir,
    getDesktopEntryPath,
    isAutostartEnabled,
    isSupportedAutostartEnvironment,
    resolveAutostartCommand,
} from "../src/autostart.mjs";

const tempDirs = [];

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })),
    );
});

describe("autostart helpers", () => {
    it("resolves the XDG autostart directory from XDG_CONFIG_HOME", () => {
        const autostartDir = getAutostartDir({ xdgConfigHome: "/tmp/config-home" });

        assert.equal(autostartDir, path.join("/tmp/config-home", "autostart"));
    });

    it("falls back to ~/.config/autostart when XDG_CONFIG_HOME is not set", () => {
        const autostartDir = getAutostartDir({ homeDir: "/home/prometeo" });

        assert.equal(autostartDir, path.join("/home/prometeo", ".config", "autostart"));
    });

    it("builds a desktop exec command escaping spaces", () => {
        const exec = buildDesktopExec("/opt/Prometeo Dashboard/prometeo", ["--no-sandbox"]);

        assert.equal(exec, "/opt/Prometeo\\ Dashboard/prometeo --no-sandbox");
    });

    it("builds a desktop entry with the required fields", () => {
        const entry = buildDesktopEntry({
            exec: "/opt/prometeo/prometeo",
            icon: "/opt/prometeo/icon.png",
        });

        assert.match(entry, /^\[Desktop Entry\]/m);
        assert.match(entry, /^Exec=\/opt\/prometeo\/prometeo$/m);
        assert.match(entry, /^Icon=\/opt\/prometeo\/icon.png$/m);
    });

    it("enables autostart by writing the desktop entry file", async () => {
        const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "prometeo-autostart-"));
        tempDirs.push(homeDir);

        const desktopEntryPath = await enableAutostart({
            homeDir,
            exec: "/opt/prometeo/prometeo",
        });

        assert.equal(
            desktopEntryPath,
            path.join(homeDir, ".config", "autostart", AUTOSTART_DESKTOP_FILE),
        );
        assert.equal(await isAutostartEnabled({ homeDir }), true);

        const content = await fs.readFile(desktopEntryPath, "utf8");
        assert.match(content, /^Exec=\/opt\/prometeo\/prometeo$/m);
    });

    it("disables autostart by deleting the desktop entry file", async () => {
        const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "prometeo-autostart-"));
        tempDirs.push(homeDir);

        await enableAutostart({
            homeDir,
            exec: "/opt/prometeo/prometeo",
        });

        assert.equal(await disableAutostart({ homeDir }), true);
        assert.equal(await isAutostartEnabled({ homeDir }), false);
    });

    it("reports support for Linux installs with a resolvable launch command", () => {
        assert.equal(
            isSupportedAutostartEnvironment({
                platform: "linux",
                isPackaged: true,
                executablePath: "/opt/prometeo/prometeo",
            }),
            true,
        );

        assert.equal(
            isSupportedAutostartEnvironment({
                platform: "linux",
                isPackaged: false,
                executablePath: "/usr/bin/electron",
                appRoot: "/srv/prometeo/app",
            }),
            true,
        );

        assert.equal(
            isSupportedAutostartEnvironment({
                platform: "linux",
                isPackaged: false,
                executablePath: "/usr/bin/electron",
            }),
            false,
        );

        assert.equal(
            isSupportedAutostartEnvironment({
                platform: "win32",
                isPackaged: true,
                executablePath: "C:/Prometeo/prometeo.exe",
            }),
            false,
        );
    });

    it("builds an autostart command for packaged and unpackaged installs", () => {
        assert.equal(
            resolveAutostartCommand({
                executablePath: "/opt/prometeo/prometeo",
                isPackaged: true,
            }),
            "/opt/prometeo/prometeo",
        );

        assert.equal(
            resolveAutostartCommand({
                executablePath: "/usr/bin/electron",
                appRoot: "/srv/prometeo shell",
                isPackaged: false,
            }),
            "/usr/bin/electron /srv/prometeo\\ shell",
        );
    });

    it("resolves the desktop entry path from the autostart dir", () => {
        const desktopEntryPath = getDesktopEntryPath({ homeDir: "/home/prometeo" });

        assert.equal(
            desktopEntryPath,
            path.join("/home/prometeo", ".config", "autostart", AUTOSTART_DESKTOP_FILE),
        );
    });
});