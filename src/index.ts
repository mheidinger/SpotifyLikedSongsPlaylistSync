import { Scopes } from "@spotify/web-api-ts-sdk";
import { parseArgs } from "util";
import type { SpotifyConfig } from "./domain/SpotifyConfig";
import getAuthToken from "./auth";
import createSpotifyClient from "./spotify";
import trackDiff from "./diff";

const clientId = process.env["SPOTIFY_CLIENT_ID"];
const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
const redirectUri = "http://localhost:3000/callback";

if (!clientId || !clientSecret) {
  throw new Error("⚠️ Missing Spotify credentials");
}

const {
  values: { dry: dryRun },
} = parseArgs({
  args: Bun.argv,
  options: {
    dry: {
      type: "boolean",
      default: false,
      short: "d",
    },
  },
  strict: true,
  allowPositionals: true,
});

const spotifyConfig: SpotifyConfig = {
  clientId,
  clientSecret,
  redirectUri,
  scopes: [...Scopes.playlist, ...Scopes.userLibraryRead],
};

const token = await getAuthToken(spotifyConfig);
const spotify = createSpotifyClient(spotifyConfig, token);

let targetPlaylistId = process.env["SPOTIFY_TARGET_PLAYLIST_ID"];
if (!targetPlaylistId) {
  console.log(
    "🎶 No target playlist configured, set SPOTIFY_TARGET_PLAYLIST_ID to one of the following:",
  );
  const playlists = await spotify.getUserPlaylists();
  console.table(playlists.map((p) => ({ name: p.name, id: p.id })));
  process.exit(1);
}

console.log("⌛ Fetching liked tracks and playlist tracks...");
const [likedTracks, playlistTracks] = await Promise.all([
  spotify.getUserLikedTracks(),
  spotify.getPlaylistTracks(targetPlaylistId),
]);

console.log("♥️  Liked tracks:", likedTracks.length);
console.log("🎶 Playlist tracks:", playlistTracks.length);
console.log();

console.log("📝 Comparing liked tracks with playlist tracks...");
const { missingTracks, additionalTracks } = trackDiff(
  likedTracks,
  playlistTracks,
);

if (missingTracks) {
  console.log("❓ Missing tracks to be added:", missingTracks.length);
  console.table(
    missingTracks.map((t) => ({
      name: t.name,
      artists: t.artists.map((a) => a.name).join(", "),
    })),
  );

  if (!dryRun) {
    console.log("⌛ Adding missing tracks to playlist...");
    await spotify.addTracksToPlaylist(targetPlaylistId, missingTracks);
    console.log("✅ Tracks added");
  }
} else {
  console.log("✅ No missing tracks");
}
console.log();

if (additionalTracks) {
  console.log("❌ Additional tracks to be removed:", additionalTracks.length);
  console.table(
    additionalTracks.map((t) => ({
      name: t.name,
      artists: t.artists.map((a) => a.name).join(", "),
    })),
  );

  if (!dryRun) {
    console.log("⌛ Removing additional tracks from playlist...");
    await spotify.removeTracksFromPlaylist(targetPlaylistId, additionalTracks);
    console.log("✅ Tracks removed");
  }
} else {
  console.log("✅ No additional tracks");
}
