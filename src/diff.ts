import type { SimplifiedTrack } from "@spotify/web-api-ts-sdk";

export default function trackDiff(
  originTracks: SimplifiedTrack[],
  targetTracks: SimplifiedTrack[],
) {
  const missingTracks = originTracks.filter(
    (track) => !targetTracks.some((t) => t.uri === track.uri),
  );

  const additionalTracks = targetTracks.filter(
    (track) => !originTracks.some((t) => t.uri === track.uri),
  );

  return {
    missingTracks: missingTracks.length > 0 ? missingTracks : null,
    additionalTracks: additionalTracks.length > 0 ? additionalTracks : null,
  };
}
