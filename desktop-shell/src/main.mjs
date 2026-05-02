import console from "node:console";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, screen, session, shell } from "electron";
import {
  enableAutostart,
  isAutostartEnabled,
  isSupportedAutostartEnvironment,
  resolveAutostartCommand,
} from "./autostart.mjs";
import { loadPreferences, savePreferences } from "./preferences.mjs";
import {
  getLatestVersion,
  isUpdateAvailable,
  shouldCheckForUpdates,
  installLatestVersion,
} from "./update-checker.mjs";
import { createBrowserWindowOptions } from "./window-options.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnvFile(path.join(__dirname, "..", ".env"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const dashboardUrl = parseUrl(
  process.env.PROMETEO_DASHBOARD_URL,
  "https://prometeo.miguelprez.es/client",
);
const allowedOrigins = new Set([dashboardUrl.origin]);
const isKiosk = !app.isPackaged || process.env.PROMETEO_KIOSK === "1";
const devToolsEnabled =
  !app.isPackaged || process.env.PROMETEO_ENABLE_DEVTOOLS === "1";
const openDevToolsOnStart = process.env.PROMETEO_OPEN_DEVTOOLS === "1";
const verboseLogs =
  !app.isPackaged || process.env.PROMETEO_VERBOSE_LOGS === "1";
const autostartPromptDisabled = process.env.PROMETEO_DISABLE_AUTOSTART_PROMPT === "1";
const updateCheckDisabled = process.env.PROMETEO_DISABLE_UPDATE_CHECK === "1";

let mainWindow = null;

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function parseUrl(value, fallback) {
  try {
    return new URL(value ?? fallback);
  } catch {
    return new URL(fallback);
  }
}

function isAllowedNavigation(target) {
  try {
    return new URL(target).origin === dashboardUrl.origin;
  } catch {
    return false;
  }
}

function isAllowedPermission(permission) {
  return new Set(["fullscreen", "media", "notifications"]).has(permission);
}

function createWindow() {
  const displayBounds = screen.getPrimaryDisplay().bounds;
  mainWindow = new BrowserWindow({
    ...createBrowserWindowOptions({
      displayBounds,
      isKiosk,
      devToolsEnabled,
      iconPath: path.join(__dirname, "..", "assets", "icon.png"),
    }),
  });

  if (isKiosk) {
    mainWindow.setBounds(displayBounds);
    mainWindow.setFullScreen(true);
    mainWindow.setKiosk(true);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!verboseLogs) return;
      console.log("[desktop-shell] did-fail-load", {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
    },
  );

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    const wantsToggleDevTools =
      input.type === "keyDown" &&
      (key === "f12" || ((input.control || input.meta) && input.shift && key === "i"));

    if (!devToolsEnabled || !wantsToggleDevTools) {
      return;
    }

    event.preventDefault();
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      return;
    }

    mainWindow.webContents.openDevTools({ mode: "detach" });
  });

  mainWindow.webContents.once("did-finish-load", () => {
    if (devToolsEnabled && openDevToolsOnStart) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });

  mainWindow.loadURL(dashboardUrl.toString());
}

function getAutostartCommand() {
  return resolveAutostartCommand({
    executablePath: app.getPath("exe"),
    appRoot: path.join(__dirname, ".."),
    isPackaged: app.isPackaged,
  });
}

async function maybePromptAutostart() {
  if (autostartPromptDisabled) {
    return;
  }

  const userDataPath = app.getPath("userData");
  const preferences = await loadPreferences({ userDataPath });
  if (preferences.suppressAutostartPrompt) {
    return;
  }

  const autostartCommand = getAutostartCommand();
  const supportsAutostart = isSupportedAutostartEnvironment({
    platform: process.platform,
    executablePath: app.getPath("exe"),
    appRoot: path.join(__dirname, ".."),
    isPackaged: app.isPackaged,
  });

  if (!supportsAutostart || !autostartCommand) {
    return;
  }

  if (await isAutostartEnabled()) {
    return;
  }

  const { response, checkboxChecked } = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Enable autostart", "Not now"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    checkboxLabel: "Do not show again",
    checkboxChecked: false,
    message: "PROMETEO Dashboard does not start automatically when you log in.",
    detail:
      "You can enable it now so this shell launches automatically when you log into this Raspberry Pi.",
  });

  if (checkboxChecked) {
    await savePreferences({
      userDataPath,
      preferences: {
        ...preferences,
        suppressAutostartPrompt: true,
      },
    });
  }

  if (response !== 0) {
    return;
  }

  try {
    await enableAutostart({ exec: autostartCommand });

    if (!(await isAutostartEnabled())) {
      throw new Error("Autostart desktop entry was not created");
    }

    await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["OK"],
      defaultId: 0,
      message: "Autostart enabled.",
      detail:
        "PROMETEO Dashboard will launch automatically the next time you log into this Raspberry Pi.",
    });
  } catch (error) {
    if (verboseLogs) {
      console.log("[desktop-shell] autostart-enable-failed", {
        message: error?.message || String(error),
      });
    }

    await dialog.showMessageBox(mainWindow, {
      type: "error",
      buttons: ["Close"],
      defaultId: 0,
      message: "Failed to enable autostart.",
      detail:
        "Check your user permissions or try again later. If the problem persists, verify the ~/.config/autostart folder.",
    });
  }
}

async function maybeCheckForUpdates() {
  if (updateCheckDisabled) {
    return;
  }

  const userDataPath = app.getPath("userData");

  try {
    const preferences = await loadPreferences({ userDataPath });
    if (!shouldCheckForUpdates(preferences)) {
      return;
    }

    const currentVersion = app.getVersion();
    const latestVersion = await getLatestVersion();

    await savePreferences({
      userDataPath,
      preferences: {
        ...preferences,
        lastUpdateCheckTime: Date.now(),
      },
    });

    if (!isUpdateAvailable(currentVersion, latestVersion)) {
      if (verboseLogs) {
        console.log("[desktop-shell] update-check", {
          currentVersion,
          latestVersion,
          available: false,
        });
      }
      return;
    }

    if (verboseLogs) {
      console.log("[desktop-shell] update-check", {
        currentVersion,
        latestVersion,
        available: true,
      });
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Update now", "Later"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      message: `New version available: ${latestVersion}`,
      detail: `You currently have version ${currentVersion} installed. Would you like to update to the new version?

The application will restart once the update is complete.`,
    });

    if (response !== 0) {
      return;
    }

    try {
      await dialog.showMessageBox(mainWindow, {
        type: "info",
        buttons: ["OK"],
        defaultId: 0,
        message: "Updating...",
        detail: "Please wait while the update is downloaded and installed.",
      });

      await installLatestVersion();

      await dialog.showMessageBox(mainWindow, {
        type: "info",
        buttons: ["OK"],
        defaultId: 0,
        message: "Update complete.",
        detail: "Please restart the application to use the new version.",
      });
    } catch (error) {
      if (verboseLogs) {
        console.log("[desktop-shell] update-install-failed", {
          message: error?.message || String(error),
        });
      }

      await dialog.showMessageBox(mainWindow, {
        type: "error",
        buttons: ["OK"],
        defaultId: 0,
        message: "Update failed.",
        detail: `Failed to download and install the update: ${error?.message || String(error)}

Try updating manually with: npm install -g @prometeo-dashboard/desktop-shell@latest`,
      });
    }
  } catch (error) {
    if (verboseLogs) {
      console.log("[desktop-shell] update-check-failed", {
        message: error?.message || String(error),
      });
    }
  }
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin) => {
      const allowed =
        Boolean(requestingOrigin) &&
        allowedOrigins.has(requestingOrigin) &&
        isAllowedPermission(permission);
      return allowed;
    },
  );

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const origin = parseUrl(details?.requestingUrl, dashboardUrl.toString()).origin;
      const allowed =
        allowedOrigins.has(origin) && isAllowedPermission(permission);

      callback(allowed);
    },
  );

  createWindow();
  void maybePromptAutostart();
  void maybeCheckForUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
