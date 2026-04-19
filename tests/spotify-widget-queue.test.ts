import { describe, expect, it } from "vitest";

import { getSpotifyQueueAdvanceSteps } from "../modules/spotify-widget/queue-controls";

describe("spotify queue controls", () => {
  it("advances once for the first upcoming track", () => {
    expect(getSpotifyQueueAdvanceSteps(3, 0)).toBe(1);
  });

  it("advances through the queue until the selected track is reached", () => {
    expect(getSpotifyQueueAdvanceSteps(5, 2)).toBe(3);
  });

  it("ignores unavailable queue targets", () => {
    expect(getSpotifyQueueAdvanceSteps(2, -1)).toBeNull();
    expect(getSpotifyQueueAdvanceSteps(2, 2)).toBeNull();
    expect(getSpotifyQueueAdvanceSteps(2, Number.NaN)).toBeNull();
  });
});
