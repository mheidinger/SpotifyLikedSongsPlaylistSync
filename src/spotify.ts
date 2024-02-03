import {
  SpotifyApi,
  type AccessToken,
  type SimplifiedPlaylist,
  type SimplifiedTrack,
} from "@spotify/web-api-ts-sdk";
import type { SpotifyConfig } from "./domain/SpotifyConfig";

async function getUserPlaylists(
  spotify: SpotifyApi,
): Promise<SimplifiedPlaylist[]> {
  const playlists: SimplifiedPlaylist[] = [];

  let response = await spotify.currentUser.playlists.playlists(50);
  playlists.push(...response.items);

  while (response.next) {
    response = await spotify.currentUser.playlists.playlists(
      50,
      response.offset + response.limit,
    );
    playlists.push(...response.items);
  }

  return playlists;
}

async function getUserLikedTracks(
  spotify: SpotifyApi,
): Promise<SimplifiedTrack[]> {
  const tracks: SimplifiedTrack[] = [];

  let response = await spotify.currentUser.tracks.savedTracks(50);
  tracks.push(...response.items.map((item) => item.track));

  while (response.next) {
    response = await spotify.currentUser.tracks.savedTracks(
      50,
      response.offset + response.limit,
    );
    tracks.push(...response.items.map((item) => item.track));
  }

  return tracks;
}

async function getPlaylistTracks(
  spotify: SpotifyApi,
  playlistId: string,
): Promise<SimplifiedTrack[]> {
  const tracks: SimplifiedTrack[] = [];

  let response = await spotify.playlists.getPlaylistItems(
    playlistId,
    undefined,
    undefined,
    50,
  );
  tracks.push(...response.items.map((item) => item.track));

  while (response.next) {
    response = await spotify.playlists.getPlaylistItems(
      playlistId,
      undefined,
      undefined,
      50,
      response.offset + response.limit,
    );
    tracks.push(...response.items.map((item) => item.track));
  }

  return tracks;
}

async function addTracksToPlaylist(
  spotify: SpotifyApi,
  playlistId: string,
  tracks: SimplifiedTrack[],
) {
  const uris = tracks.map((t) => t.uri);
  await spotify.playlists.addItemsToPlaylist(playlistId, uris);
}

async function removeTracksFromPlaylist(
  spotify: SpotifyApi,
  playlistId: string,
  tracks: SimplifiedTrack[],
) {
  await spotify.playlists.removeItemsFromPlaylist(playlistId, { tracks });
}

export default function createSpotifyClient(
  spotifyConfig: SpotifyConfig,
  token: AccessToken,
) {
  const spotify = SpotifyApi.withAccessToken(spotifyConfig.clientId, token);
  return {
    getUserPlaylists: () => getUserPlaylists(spotify),
    getUserLikedTracks: () => getUserLikedTracks(spotify),
    getPlaylistTracks: (playlistId: string) =>
      getPlaylistTracks(spotify, playlistId),
    addTracksToPlaylist: (playlistId: string, tracks: SimplifiedTrack[]) =>
      addTracksToPlaylist(spotify, playlistId, tracks),
    removeTracksFromPlaylist: (playlistId: string, tracks: SimplifiedTrack[]) =>
      removeTracksFromPlaylist(spotify, playlistId, tracks),
  };
}
