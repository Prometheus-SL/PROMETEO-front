import { describe, expect, it, vi } from "vitest";

import {
  createSpotifyWebPlaybackController,
  type SpotifyWebPlaybackSdk,
} from "../modules/spotify-widget/spotify-web-playback";

function flushMicrotasks() {
  return new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
}

describe("Spotify Web Playback controller", () => {
  function createFakeSdk() {
    type Listener = (payload: { device_id: string }) => void;
    const listeners = new Map<string, Listener>();
    const transferPlayback = vi.fn(async () => undefined);
    const activateElement = vi.fn(async () => undefined);

    class FakePlayer {
      addListener(event: string, callback: Listener) {
        listeners.set(event, callback);
        return true;
      }

      connect() {
        return Promise.resolve(true);
      }

      disconnect() {
        return undefined;
      }

      activateElement() {
        return activateElement();
      }
    }

    return {
      activateElement,
      listeners,
      transferPlayback,
      sdk: {
        Player: FakePlayer,
      } as unknown as SpotifyWebPlaybackSdk,
    };
  }

  it("waits for the user action before transferring playback to the browser device", async () => {
    const { activateElement, listeners, sdk, transferPlayback } = createFakeSdk();

    const controller = createSpotifyWebPlaybackController({
      getToken: async () => "spotify-token",
      loadSdk: async () => sdk,
      transferPlayback,
    });

    await controller.connect();
    listeners.get("ready")?.({ device_id: "browser-device-1" });
    await flushMicrotasks();

    expect(transferPlayback).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      status: "ready",
      deviceId: "browser-device-1",
      activationRequired: false,
    });

    await controller.activate();

    expect(activateElement).toHaveBeenCalledTimes(1);
    expect(transferPlayback).toHaveBeenCalledWith("browser-device-1", true);
    expect(controller.getSnapshot()).toMatchObject({
      status: "active",
      deviceId: "browser-device-1",
      activationRequired: false,
    });
  });

  it("keeps a user transfer request available while the browser device is still preparing", async () => {
    const { activateElement, listeners, sdk, transferPlayback } = createFakeSdk();

    const controller = createSpotifyWebPlaybackController({
      getToken: async () => "spotify-token",
      loadSdk: async () => sdk,
      transferPlayback,
    });

    await controller.activate();

    expect(activateElement).toHaveBeenCalledTimes(1);
    expect(transferPlayback).not.toHaveBeenCalled();

    listeners.get("ready")?.({ device_id: "late-browser-device" });
    await flushMicrotasks();

    expect(transferPlayback).toHaveBeenCalledWith("late-browser-device", true);
    expect(controller.getSnapshot()).toMatchObject({
      status: "active",
      deviceId: "late-browser-device",
      activationRequired: false,
    });
  });
});
