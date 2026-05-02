import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureApi } from "../src/lib/api";
import {
  executeSparkClientActions,
  resumeSparkRun,
  sendSparkMessage,
  transcribeAudio,
} from "../modules/spark-widget/ai-service";
import { installTestEnvironment } from "./helpers/testEnvironment";

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("spark ai-service backend broker", () => {
  beforeEach(() => {
    installTestEnvironment();
    configureApi({
      getAccessToken: () => localStorage.getItem("auth_access_token"),
      tryRefreshTokens: async () => false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends Spark messages to the backend broker", async () => {
    const { fetchMock, storage } = installTestEnvironment();
    storage.set("auth_access_token", "app-token");
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          status: "completed",
          message: "He apagado las luces.",
          clientActions: [],
          toolResults: [],
        },
      }),
    );

    const response = await sendSparkMessage("apaga las luces");

    expect(response.message).toBe("He apagado las luces.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/spark/message"),
      expect.objectContaining({ method: "POST" }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ message: "apaga las luces" });
  });

  it("uploads audio to the backend transcription endpoint", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: { text: "apaga las luces" },
      }),
    );

    const text = await transcribeAudio(new Blob(["audio"], { type: "audio/webm" }), "speech.webm");

    expect(text).toBe("apaga las luces");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/spark/transcribe"),
      expect.objectContaining({ method: "POST" }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("executes WLED browser actions and resumes the pending Spark run", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          on: false,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            status: "completed",
            message: "WLED apagado.",
            clientActions: [],
            toolResults: [],
          },
        }),
      );

    const response = await executeSparkClientActions({
      status: "waiting_for_client",
      runId: "run-1",
      message: "ejecucion local",
      toolResults: [],
      clientActions: [
        {
          id: "client-call-1",
          type: "wled.set_power",
          provider: "wled",
          payload: {
            deviceIp: "192.168.1.55",
            useSsl: false,
            power: "off",
          },
        },
      ],
    });

    expect(response.message).toBe("WLED apagado.");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://192.168.1.55/json/state",
      expect.objectContaining({ method: "POST" }),
    );

    const [, wledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(wledInit.body))).toEqual({ on: false, v: true });

    const [, resumeInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/spark/runs/run-1/client-results"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(resumeInit.body))).toEqual({
      results: [
        {
          id: "client-call-1",
          success: true,
          message: "WLED apagado.",
          data: { on: false },
        },
      ],
    });
  });

  it("continues executing browser actions when a resumed Spark run is still waiting", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock
      .mockResolvedValueOnce(createJsonResponse({ on: false }))
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            status: "waiting_for_client",
            runId: "run-2",
            message: "otra accion local",
            toolResults: [],
            clientActions: [
              {
                id: "client-call-2",
                type: "wled.set_power",
                provider: "wled",
                payload: {
                  deviceIp: "192.168.1.56",
                  useSsl: false,
                  power: "on",
                },
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ on: true }))
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            status: "completed",
            message: "Todo listo.",
            clientActions: [],
            toolResults: [],
          },
        }),
      );

    const response = await executeSparkClientActions({
      status: "waiting_for_client",
      runId: "run-1",
      message: "ejecucion local",
      toolResults: [],
      clientActions: [
        {
          id: "client-call-1",
          type: "wled.set_power",
          provider: "wled",
          payload: {
            deviceIp: "192.168.1.55",
            useSsl: false,
            power: "off",
          },
        },
      ],
    });

    expect(response.status).toBe("completed");
    expect(response.message).toBe("Todo listo.");
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://192.168.1.56/json/state",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("/api/v1/spark/runs/run-2/client-results"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("resumes Spark runs through the backend", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock.mockResolvedValue(
      createJsonResponse({
        success: true,
        data: {
          status: "completed",
          message: "Listo.",
          clientActions: [],
          toolResults: [],
        },
      }),
    );

    const response = await resumeSparkRun("run-1", [
      { id: "client-call-1", success: true, message: "ok" },
    ]);

    expect(response.status).toBe("completed");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/spark/runs/run-1/client-results"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("executes WLED next-effect browser actions before resuming the Spark run", async () => {
    const { fetchMock } = installTestEnvironment();
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          state: {
            mainseg: 0,
            seg: [{ id: 0, fx: 1 }],
          },
          effects: ["Solid", "Blink", "Rainbow"],
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ seg: [{ id: 0, fx: 2 }] }))
      .mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            status: "completed",
            message: "Efecto cambiado.",
            clientActions: [],
            toolResults: [],
          },
        }),
      );

    const response = await executeSparkClientActions({
      status: "waiting_for_client",
      runId: "run-fx",
      message: "cambia el efecto",
      toolResults: [],
      clientActions: [
        {
          id: "client-call-fx",
          type: "wled.next_effect",
          provider: "wled",
          payload: {
            deviceIp: "192.168.1.55",
            useSsl: false,
          },
        },
      ],
    });

    expect(response.status).toBe("completed");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://192.168.1.55/json",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://192.168.1.55/json/state",
      expect.objectContaining({ method: "POST" }),
    );

    const [, stateInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(stateInit.signal).toBeDefined();
    expect(JSON.parse(String(stateInit.body))).toEqual({
      seg: [{ id: 0, fx: 2 }],
      v: true,
    });

    const [, resumeInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(JSON.parse(String(resumeInit.body))).toEqual({
      results: [
        {
          id: "client-call-fx",
          success: true,
          message: "WLED efecto cambiado a Rainbow.",
          data: { seg: [{ id: 0, fx: 2 }] },
        },
      ],
    });
  });
});
