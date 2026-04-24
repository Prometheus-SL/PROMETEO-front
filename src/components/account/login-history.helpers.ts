import type { LoginHistoryEntry } from "@/services/auth";

type LoginHistoryPresentation = {
  normalizedMethod: string;
  providerLabel: string | null;
  title: string;
  channelLabel: string;
  failureLabel: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  discord: "Discord",
  github: "GitHub",
  google: "Google",
};

const METHOD_TITLES: Record<string, string> = {
  agent: "Agent sign-in",
  oauth: "Provider sign-in",
  password: "Password sign-in",
  qr: "QR sign-in",
  refresh: "Session refresh",
};

const CHANNEL_LABELS: Record<string, string> = {
  agent: "Agent",
  oauth: "OAuth",
  password: "Password",
  qr: "QR",
  refresh: "Refresh",
};

function toSentenceCase(value: string) {
  if (!value) return "Unknown event.";

  const normalized = value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "Unknown event.";
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}.`;
}

function toProviderLabel(provider: string | null) {
  if (!provider) return null;
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

function normalizeMethod(entry: LoginHistoryEntry) {
  let normalizedMethod = entry.method || "password";
  let provider = entry.provider || null;

  if (normalizedMethod.startsWith("oauth:")) {
    provider = provider || normalizedMethod.slice("oauth:".length);
    normalizedMethod = "oauth";
  }

  return {
    normalizedMethod,
    provider,
  };
}

function getFailureLabel(entry: LoginHistoryEntry) {
  if (entry.success) return null;

  switch (entry.failureReason) {
    case "ACCESS_DENIED":
      return "Access denied.";
    case "INVALID_CREDENTIALS":
      return "The password did not match this account.";
    case "INVALID_TOTP_TOKEN":
      return "The verification code or recovery code was not valid.";
    case "RATE_LIMIT_EXCEEDED":
      return "Too many attempts. Please wait before trying again.";
    default:
      return toSentenceCase(entry.failureReason || "Sign in failed");
  }
}

export function getLoginHistoryPresentation(
  entry: LoginHistoryEntry,
): LoginHistoryPresentation {
  const { normalizedMethod, provider } = normalizeMethod(entry);
  const providerLabel = toProviderLabel(provider);
  const isSecondFactorFailure =
    normalizedMethod === "password" && entry.failureReason === "INVALID_TOTP_TOKEN";

  return {
    normalizedMethod,
    providerLabel,
    title: isSecondFactorFailure
      ? "Two-factor verification"
      : normalizedMethod === "oauth" && providerLabel
        ? `${providerLabel} provider sign-in`
        : METHOD_TITLES[normalizedMethod] || "Sign-in event",
    channelLabel: CHANNEL_LABELS[normalizedMethod] || "Sign-in",
    failureLabel: getFailureLabel(entry),
  };
}
