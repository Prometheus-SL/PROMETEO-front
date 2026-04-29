import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, session, shell } from "electron";

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
  mainWindow = new BrowserWindow({
    fullscreen: isKiosk,
    resizable: false,
    autoHideMenuBar: true,
    thickFrame: !isKiosk,
    backgroundColor: "#08111f",
    frame: !isKiosk,
    kiosk: isKiosk,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      devTools: devToolsEnabled,
    },
    icon: path.join(__dirname, "..", "assets", "icon.png"),
  });


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

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler(
    (_webContents, permission, requestingOrigin, details) => {
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
