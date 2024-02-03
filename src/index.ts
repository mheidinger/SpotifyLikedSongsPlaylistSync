import { Scopes, SpotifyApi } from "@spotify/web-api-ts-sdk";
import getAuthToken from "./auth";
import type { SpotifyConfig } from "./domain/SpotifyConfig";

const clientId = process.env["SPOTIFY_CLIENT_ID"];
const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];
const redirectUri = "http://localhost:3000/callback";

if (!clientId || !clientSecret) {
  throw new Error("Missing Spotify credentials");
}

const spotifyConfig: SpotifyConfig = {
  clientId,
  clientSecret,
  redirectUri,
  scopes: [...Scopes.playlist, ...Scopes.userLibraryRead],
};

const token = await getAuthToken(spotifyConfig);
const spotify = SpotifyApi.withAccessToken(spotifyConfig.clientId, token);

const playlistItems = await spotify.currentUser.playlists.playlists();
console.table(
  playlistItems.items.map((item) => ({
    name: item.name,
    id: item.id,
  })),
);

const trackItems = await spotify.playlists.getPlaylistItems(
  "0zl3AN8PLohu9R61CoJzud",
);
console.table(
  trackItems.items.map((item) => ({
    name: item.track.name,
    uri: item.track.uri,
  })),
);
