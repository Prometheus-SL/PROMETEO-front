import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_PREFERENCES = {
    suppressAutostartPrompt: false,
    lastUpdateCheckTime: 0,
};

export function getPreferencesPath(userDataPath) {
    return path.join(userDataPath, "preferences.json");
}

export async function loadPreferences({
    userDataPath,
    fsModule = fs,
} = {}) {
    if (!userDataPath) {
        throw new Error("userDataPath is required");
    }

    const preferencesPath = getPreferencesPath(userDataPath);

    try {
        const content = await fsModule.readFile(preferencesPath, "utf8");
        return {
            ...DEFAULT_PREFERENCES,
            ...JSON.parse(content),
        };
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return { ...DEFAULT_PREFERENCES };
        }

        throw error;
    }
}

export async function savePreferences({
    userDataPath,
    preferences,
    fsModule = fs,
} = {}) {
    if (!userDataPath) {
        throw new Error("userDataPath is required");
    }

    const preferencesPath = getPreferencesPath(userDataPath);
    const nextPreferences = {
        ...DEFAULT_PREFERENCES,
        ...(preferences || {}),
    };

    await fsModule.mkdir(userDataPath, { recursive: true });
    await fsModule.writeFile(
        preferencesPath,
        JSON.stringify(nextPreferences, null, 2),
        "utf8",
    );

    return nextPreferences;
}
