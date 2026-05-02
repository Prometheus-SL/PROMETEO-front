import { WledApi } from "./wled-api";
import type {
  SparkClientAction,
  SparkClientActionExecutor,
  SparkClientActionResult,
} from "@/modules/ai/types";

async function executeWledSetPower(
  action: SparkClientAction,
): Promise<SparkClientActionResult> {
  const deviceIp = String(action.payload.deviceIp ?? "").trim();
  const power = action.payload.power === "on" ? "on" : "off";
  const useSsl = Boolean(action.payload.useSsl);

  if (!deviceIp) {
    throw new Error("WLED no tiene IP configurada.");
  }

  const api = new WledApi(deviceIp, useSsl);
  const data = power === "on" ? await api.turnOn() : await api.turnOff();

  return {
    id: action.id,
    success: true,
    message: `WLED ${power === "on" ? "encendido" : "apagado"}.`,
    data,
  };
}

async function executeWledNextEffect(
  action: SparkClientAction,
): Promise<SparkClientActionResult> {
  const deviceIp = String(action.payload.deviceIp ?? "").trim();
  const useSsl = Boolean(action.payload.useSsl);

  if (!deviceIp) {
    throw new Error("WLED no tiene IP configurada.");
  }

  const api = new WledApi(deviceIp, useSsl);
  const snapshot = await api.getFullState();
  const segments = Array.isArray(snapshot.state?.seg) ? snapshot.state.seg : [];
  const mainSegIndex = Number(snapshot.state?.mainseg ?? 0);
  const segment = segments[mainSegIndex] ?? segments[0];

  if (!segment) {
    throw new Error("WLED no tiene segmentos activos.");
  }

  const effects = Array.isArray(snapshot.effects) ? snapshot.effects : [];
  const maxFx = effects.length > 0 ? effects.length - 1 : Math.max(Number(segment.fx ?? 0), 0);
  const currentFx = Math.max(Number(segment.fx ?? 0), 0);
  const nextFx = currentFx >= maxFx ? 0 : currentFx + 1;
  const data = await api.setSegmentEffect(Number(segment.id ?? mainSegIndex), nextFx);
  const effectName = effects[nextFx] ?? `#${nextFx}`;

  return {
    id: action.id,
    success: true,
    message: `WLED efecto cambiado a ${effectName}.`,
    data,
  };
}

export const sparkClientExecutors: Record<string, SparkClientActionExecutor> = {
  "wled.next_effect": executeWledNextEffect,
  "wled.set_power": executeWledSetPower,
};
