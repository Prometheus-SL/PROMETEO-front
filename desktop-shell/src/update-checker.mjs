import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PACKAGE_NAME = "@prometeo-dashboard/desktop-shell";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function shouldCheckForUpdates(preferences = {}) {
    const lastCheckTime = preferences.lastUpdateCheckTime || 0;
    const now = Date.now();

    return now - lastCheckTime >= CHECK_INTERVAL_MS;
}

export async function getLatestVersion() {
    try {
        const { stdout } = await execFileAsync("npm", ["view", PACKAGE_NAME, "version"], {
            timeout: 5000,
        });

        const version = stdout.trim();
        if (!version || typeof version !== "string") {
            throw new Error("Invalid version response");
        }

        return version;
    } catch (error) {
        if (error?.code === "ENOENT") {
            throw new Error("npm command not found", { cause: error });
        }

        throw error;
    }
}

export function compareVersions(current, latest) {
    const currentParts = current.split(".").map(Number);
    const latestParts = latest.split(".").map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;

        if (latestPart > currentPart) {
            return 1; // latest is newer
        }

        if (latestPart < currentPart) {
            return -1; // current is newer
        }
    }

    return 0; // equal
}

export function isUpdateAvailable(currentVersion, latestVersion) {
    return compareVersions(currentVersion, latestVersion) > 0;
}

export async function installLatestVersion() {
    try {
        await execFileAsync("npm", ["install", "-g", `${PACKAGE_NAME}@latest`], {
            timeout: 120000, // 2 minutos
        });

        return true;
    } catch (error) {
        if (error?.code === "ENOENT") {
            throw new Error("npm command not found", { cause: error });
        }

        throw error;
    }
}
