import {
  api,
  request,
  unwrapApiData,
  type ApiEnvelope,
} from "@/lib/api";
import { getSparkClientActionExecutor } from "@/modules/ai/clientRegistry";
import type {
  SparkClientAction,
  SparkClientActionResult,
} from "@/modules/ai/types";

export type SparkStatus = "completed" | "waiting_for_client" | "failed";

export type SparkResponse = {
  status: SparkStatus;
  runId?: string | null;
  message: string;
  clientActions: SparkClientAction[];
  toolResults: unknown[];
};

const MAX_CLIENT_ACTION_ROUNDS = 4;

export async function sendSparkMessage(message: string): Promise<SparkResponse> {
  return api.postData<SparkResponse>("/api/v1/spark/message", { message });
}

export async function resumeSparkRun(
  runId: string,
  results: SparkClientActionResult[],
): Promise<SparkResponse> {
  return api.postData<SparkResponse>(
    `/api/v1/spark/runs/${encodeURIComponent(runId)}/client-results`,
    { results },
  );
}

export async function askAI(question: string): Promise<string> {
  const firstResponse = await sendSparkMessage(question);
  const finalResponse = await executeSparkClientActions(firstResponse);

  return finalResponse.message || "Listo.";
}

export async function transcribeAudio(
  audio: Blob,
  fileName = "speech.webm",
): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audio, fileName);

  const payload = await request<ApiEnvelope<{ text: string }>>(
    "/api/v1/spark/transcribe",
    {
      method: "POST",
      formData,
    },
  );
  const data = unwrapApiData(payload);

  return data.text.trim();
}

export async function executeSparkClientActions(
  response: SparkResponse,
): Promise<SparkResponse> {
  let current = response;

  for (let round = 0; round < MAX_CLIENT_ACTION_ROUNDS; round += 1) {
    if (
      current.status !== "waiting_for_client" ||
      current.clientActions.length === 0
    ) {
      return current;
    }

    if (!current.runId) {
      throw new Error("Spark necesita runId para reanudar acciones locales.");
    }

    const results = await Promise.all(
      current.clientActions.map(executeSparkClientAction),
    );

    current = await resumeSparkRun(current.runId, results);
  }

  throw new Error("Spark supero el limite de acciones locales encadenadas.");
}

async function executeSparkClientAction(
  action: SparkClientAction,
): Promise<SparkClientActionResult> {
  try {
    const executor = getSparkClientActionExecutor(action.type);
    if (executor) {
      return await executor(action);
    }

    return {
      id: action.id,
      success: false,
      message: `Accion local no soportada: ${action.type}`,
    };
  } catch (error) {
    return {
      id: action.id,
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar la accion local.",
    };
  }
}
