export function createBrowserWindowOptions({
  displayBounds,
  isKiosk,
  devToolsEnabled,
  iconPath,
}) {
  const kioskBounds = isKiosk
    ? {
        x: displayBounds.x,
        y: displayBounds.y,
        width: displayBounds.width,
        height: displayBounds.height,
      }
    : {};

  return {
    ...kioskBounds,
    fullscreen: isKiosk,
    resizable: !isKiosk,
    autoHideMenuBar: true,
    thickFrame: !isKiosk,
    frame: !isKiosk,
    kiosk: isKiosk,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      devTools: devToolsEnabled,
    },
    icon: iconPath,
  };
}
