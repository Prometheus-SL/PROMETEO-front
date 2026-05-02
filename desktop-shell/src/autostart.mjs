import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export const AUTOSTART_DESKTOP_FILE = "prometeo-dashboard.desktop";

export function resolveAutostartCommand({
    executablePath,
    appRoot,
    isPackaged = false,
} = {}) {
    if (!executablePath || typeof executablePath !== "string") {
        return null;
    }

    if (isPackaged) {
        return buildDesktopExec(executablePath);
    }

    if (!appRoot || typeof appRoot !== "string") {
        return null;
    }

    return buildDesktopExec(executablePath, [appRoot]);
}

export function getAutostartDir({
    homeDir = os.homedir(),
    xdgConfigHome = process.env.XDG_CONFIG_HOME,
} = {}) {
    if (xdgConfigHome) {
        return path.join(xdgConfigHome, "autostart");
    }

    return path.join(homeDir, ".config", "autostart");
}

export function getDesktopEntryPath(options = {}) {
    return path.join(getAutostartDir(options), AUTOSTART_DESKTOP_FILE);
}

export function isSupportedAutostartEnvironment({
    platform = process.platform,
    isPackaged = false,
    executablePath,
    appRoot,
} = {}) {
    if (platform !== "linux") {
        return false;
    }

    return Boolean(
        resolveAutostartCommand({
            executablePath,
            appRoot,
            isPackaged,
        }),
    );
}

function escapeDesktopValue(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, " ")
        .replace(/"/g, '\\"')
        .replace(/ /g, "\\ ");
}

export function buildDesktopExec(executablePath, args = []) {
    return [executablePath, ...args].map(escapeDesktopValue).join(" ");
}

export function buildDesktopEntry({
    name = "Prometeo Dashboard",
    exec,
    icon,
    comment = "Launch PROMETEO Dashboard",
} = {}) {
    if (!exec) {
        throw new Error("Exec command is required for desktop entry");
    }

    const lines = [
        "[Desktop Entry]",
        "Type=Application",
        "Version=1.0",
        `Name=${name}`,
        `Comment=${comment}`,
        `Exec=${exec}`,
        "Terminal=false",
        "StartupNotify=false",
        "Categories=Utility;",
    ];

    if (icon) {
        lines.push(`Icon=${icon}`);
    }

    return `${lines.join("\n")}\n`;
}

export async function isAutostartEnabled(options = {}) {
    const desktopEntryPath = getDesktopEntryPath(options);

    try {
        await fs.access(desktopEntryPath);
        return true;
    } catch {
        return false;
    }
}

export async function enableAutostart({
    exec,
    icon,
    fsModule = fs,
    ...pathOptions
} = {}) {
    const autostartDir = getAutostartDir(pathOptions);
    const desktopEntryPath = getDesktopEntryPath(pathOptions);
    const desktopEntry = buildDesktopEntry({ exec, icon });

    await fsModule.mkdir(autostartDir, { recursive: true });
    await fsModule.writeFile(desktopEntryPath, desktopEntry, "utf8");

    return desktopEntryPath;
}

export async function disableAutostart({ fsModule = fs, ...pathOptions } = {}) {
    const desktopEntryPath = getDesktopEntryPath(pathOptions);

    try {
        await fsModule.unlink(desktopEntryPath);
        return true;
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return false;
        }

        throw error;
    }
}