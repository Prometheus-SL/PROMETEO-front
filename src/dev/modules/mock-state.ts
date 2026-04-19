import type { ZodIssue } from "zod";

import type { ModuleDevMockAdapter } from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function formatZodIssue(issue: ZodIssue | undefined) {
  if (!issue) {
    return "Mock state does not match the adapter schema.";
  }

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export function resolveModuleDevMockState(
  adapter: ModuleDevMockAdapter | null,
): Record<string, unknown> {
  const initialState = adapter?.createInitialState?.() ?? {};

  if (!adapter?.stateSchema) {
    return asRecord(initialState);
  }

  const parsed = adapter.stateSchema.safeParse(initialState);
  if (!parsed.success) {
    return asRecord(initialState);
  }

  return asRecord(parsed.data);
}

export function parseModuleDevMockStateValue(
  value: unknown,
  adapter: ModuleDevMockAdapter | null,
  fallback?: Record<string, unknown>,
): { error: string | null; value: Record<string, unknown> } {
  const safeFallback = asRecord(fallback ?? resolveModuleDevMockState(adapter));

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      error: "Expected a JSON object.",
      value: safeFallback,
    };
  }

  if (!adapter?.stateSchema) {
    return {
      error: null,
      value: value as Record<string, unknown>,
    };
  }

  const parsed = adapter.stateSchema.safeParse(value);
  if (!parsed.success) {
    return {
      error: formatZodIssue(parsed.error.issues[0]),
      value: safeFallback,
    };
  }

  return {
    error: null,
    value: asRecord(parsed.data),
  };
}

export function parseModuleDevMockStateText(
  text: string,
  adapter: ModuleDevMockAdapter | null,
  fallback?: Record<string, unknown>,
): { error: string | null; value: Record<string, unknown> } {
  try {
    return parseModuleDevMockStateValue(JSON.parse(text) as unknown, adapter, fallback);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      value: asRecord(fallback ?? resolveModuleDevMockState(adapter)),
    };
  }
}
