export type SparkClientAction = {
  id: string;
  type: string;
  provider: string;
  payload: Record<string, unknown>;
};

export type SparkClientActionResult = {
  id: string;
  success: boolean;
  message: string;
  data?: unknown;
};

export type SparkClientActionExecutor = (
  action: SparkClientAction,
) => Promise<SparkClientActionResult>;
