import type { Session } from "@/services/auth";

export type SessionDeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export type SessionPresentation = {
  browserLabel: string | null;
  deviceLabel: string;
  deviceType: SessionDeviceType;
  networkLabel: string;
  osLabel: string | null;
  primaryLabel: string;
  secondaryLabel: string;
  sessionLabel: string;
};

function detectDeviceType(userAgent: string): SessionDeviceType {
  if (!userAgent) return "unknown";

  const normalized = userAgent.toLowerCase();

  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return "tablet";
  }

  if (
    normalized.includes("iphone") ||
    normalized.includes("android") ||
    normalized.includes("mobile")
  ) {
    return "mobile";
  }

  if (
    normalized.includes("windows nt") ||
    normalized.includes("macintosh") ||
    normalized.includes("mac os x") ||
    normalized.includes("linux") ||
    normalized.includes("cros")
  ) {
    return "desktop";
  }

  return "unknown";
}

function detectBrowser(userAgent: string) {
  if (!userAgent) return null;

  const normalized = userAgent.toLowerCase();

  if (normalized.includes("edg/")) return "Edge";
  if (normalized.includes("opr/") || normalized.includes("opera")) return "Opera";
  if (normalized.includes("samsungbrowser/")) return "Samsung Internet";
  if (normalized.includes("firefox/") || normalized.includes("fxios/")) return "Firefox";
  if (normalized.includes("crios/")) return "Chrome";
  if (normalized.includes("chrome/")) return "Chrome";
  if (
    normalized.includes("safari/") &&
    normalized.includes("version/") &&
    !normalized.includes("chrome/") &&
    !normalized.includes("crios/") &&
    !normalized.includes("android")
  ) {
    return "Safari";
  }

  return null;
}

function detectOs(userAgent: string) {
  if (!userAgent) return null;

  const normalized = userAgent.toLowerCase();

  if (normalized.includes("iphone")) return "iPhone";
  if (normalized.includes("ipad")) return "iPad";
  if (normalized.includes("android")) return "Android";
  if (normalized.includes("windows nt")) return "Windows";
  if (normalized.includes("macintosh") || normalized.includes("mac os x")) return "macOS";
  if (normalized.includes("cros")) return "ChromeOS";
  if (normalized.includes("linux")) return "Linux";

  return null;
}

function getDeviceLabel(deviceType: SessionDeviceType) {
  switch (deviceType) {
    case "desktop":
      return "Desktop device";
    case "mobile":
      return "Mobile device";
    case "tablet":
      return "Tablet";
    default:
      return "Unknown device";
  }
}

function isLoopbackIp(value: string) {
  return value === "::1" || value === "127.0.0.1" || value === "::ffff:127.0.0.1";
}

function isPrivateNetworkIp(value: string) {
  return (
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^::ffff:10\./.test(value) ||
    /^::ffff:192\.168\./.test(value) ||
    /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^fc/i.test(value) ||
    /^fd/i.test(value)
  );
}

function getNetworkLabel(ip?: string | null) {
  const normalizedIp = String(ip || "").trim();
  if (!normalizedIp) {
    return "Location unavailable";
  }

  if (isLoopbackIp(normalizedIp)) {
    return "This device";
  }

  if (isPrivateNetworkIp(normalizedIp)) {
    return "Private network";
  }

  return `IP ${normalizedIp}`;
}

function getPrimaryLabel(browserLabel: string | null, osLabel: string | null) {
  if (browserLabel && osLabel) {
    return `${browserLabel} on ${osLabel}`;
  }

  if (browserLabel) return browserLabel;
  if (osLabel) return osLabel;
  return "Unknown device";
}

function getSecondaryLabel(
  deviceLabel: string,
  browserLabel: string | null,
  osLabel: string | null,
) {
  if (!browserLabel && !osLabel) {
    return "Browser and operating system unavailable";
  }

  return deviceLabel;
}

function getSessionLabel(session: Session) {
  const id = session.sessionId || session._id || "unknown";
  return `Session ${id.slice(0, 8)}`;
}

export function getSessionPresentation(session: Session): SessionPresentation {
  const userAgent = String(session.userAgent || "");
  const deviceType = detectDeviceType(userAgent);
  const browserLabel = detectBrowser(userAgent);
  const osLabel = detectOs(userAgent);
  const deviceLabel = getDeviceLabel(deviceType);

  return {
    browserLabel,
    deviceLabel,
    deviceType,
    networkLabel: getNetworkLabel(session.ip),
    osLabel,
    primaryLabel: getPrimaryLabel(browserLabel, osLabel),
    secondaryLabel: getSecondaryLabel(deviceLabel, browserLabel, osLabel),
    sessionLabel: getSessionLabel(session),
  };
}

export function sortSessionsForDisplay(sessions: Session[]) {
  return [...sessions].sort((left, right) => {
    if (Boolean(left.current) !== Boolean(right.current)) {
      return left.current ? -1 : 1;
    }

    const leftDate = new Date(left.lastUsedAt || left.createdAt).getTime();
    const rightDate = new Date(right.lastUsedAt || right.createdAt).getTime();
    return rightDate - leftDate;
  });
}
