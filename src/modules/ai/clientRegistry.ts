import type { SparkClientActionExecutor } from "./types";

type WidgetAiExports = {
  sparkClientExecutors?: Record<string, SparkClientActionExecutor>;
};

const moduleAiGlobs = import.meta.glob("/modules/*/ai.{ts,js}", {
  eager: true,
}) as Record<string, WidgetAiExports>;

const sparkClientExecutors = new Map<string, SparkClientActionExecutor>();

for (const moduleExports of Object.values(moduleAiGlobs)) {
  const executors = moduleExports?.sparkClientExecutors;
  if (!executors || typeof executors !== "object") continue;

  for (const [actionType, executor] of Object.entries(executors)) {
    if (typeof executor !== "function") continue;
    sparkClientExecutors.set(actionType, executor);
  }
}

export function getSparkClientActionExecutor(actionType: string) {
  return sparkClientExecutors.get(actionType) ?? null;
}
