export function getSpotifyQueueAdvanceSteps(
  queueLength: number,
  targetIndex: number,
) {
  if (!Number.isFinite(targetIndex)) return null;

  const normalizedIndex = Math.floor(targetIndex);
  if (normalizedIndex < 0 || normalizedIndex >= queueLength) return null;

  return normalizedIndex + 1;
}
