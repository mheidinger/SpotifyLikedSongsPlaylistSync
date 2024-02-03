import type { SpotifyConfig } from "./domain/SpotifyConfig";
import randomstring from "randomstring";
import querystring from "querystring";
import open from "open";
import { SpotifyApi, type AccessToken } from "@spotify/web-api-ts-sdk";
import { z } from "zod";

const CACHE_PATH = "tokenCache.json";

const AccessTokenSchema: z.ZodType<AccessToken> = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  expires: z.number().optional(),
});

function getAuthorizeUrl(spotifyConfig: SpotifyConfig) {
  const state = randomstring.generate(16);
  return (
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: spotifyConfig.clientId,
      scope: spotifyConfig.scopes.join(" "),
      redirect_uri: spotifyConfig.redirectUri,
      state,
    })
  );
}

async function tokenServer(spotifyConfig: SpotifyConfig): Promise<AccessToken> {
  let token: AccessToken | null = null;

  const authorizationHeader =
    "Basic " +
    Buffer.from(
      spotifyConfig.clientId + ":" + spotifyConfig.clientSecret,
    ).toString("base64");

  const server = Bun.serve({
    development: true,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname !== "/callback") {
        return new Response("Not Found", { status: 404 });
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (state === null) {
        throw new Error("State Mismatch");
      } else if (code === null) {
        throw new Error("Code not found");
      } else {
        const responseBody = await fetch(
          "https://accounts.spotify.com/api/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: authorizationHeader,
            },
            body: new URLSearchParams({
              code,
              redirect_uri: spotifyConfig.redirectUri,
              grant_type: "authorization_code",
            }),
          },
        ).then((res) => res.json());

        token = AccessTokenSchema.parse(responseBody);
      }
      return new Response("Success! You can close this tab.");
    },
  });

  while (token === null) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.stop();
  return token;
}

async function getClientFromCache(
  clientId: string,
): Promise<SpotifyApi | null> {
  try {
    const cacheFile = Bun.file(CACHE_PATH);
    const fileContent = await cacheFile.json();
    const cacheToken = AccessTokenSchema.parse(fileContent);

    const client = SpotifyApi.withAccessToken(clientId, cacheToken);
    const authResponse = await client.authenticate();
    if (!authResponse.authenticated) {
      return null;
    }

    return client;
  } catch (e) {
    console.log(
      "Token Cache not found, invalid or expired. Starting auth flow.",
    );
  }

  return null;
}

async function writeTokenToCache(token: AccessToken) {
  try {
    await Bun.write(CACHE_PATH, JSON.stringify(token));
  } catch (e) {
    console.log(`Error writing token to cache: ${e}`);
  }
}

export default async function createClient(
  spotifyConfig: SpotifyConfig,
): Promise<SpotifyApi> {
  let client = await getClientFromCache(spotifyConfig.clientId);
  if (!client) {
    const tokenPromise = tokenServer(spotifyConfig);
    open(getAuthorizeUrl(spotifyConfig));

    client = SpotifyApi.withAccessToken(
      spotifyConfig.clientId,
      await tokenPromise,
    );
  }

  // Fetch token from client to have expiry field filled in the cache
  const token = await client.getAccessToken();
  if (token) {
    writeTokenToCache(token);
  }

  return client;
}
