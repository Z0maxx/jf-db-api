import { envConfig } from "@/env-config";
import { SteamFailedError, SteamUsersNotFoundError } from "@/errors";
import { SteamUser } from "@/types";

type SteamPlayerSummaries = {
  response: {
    players: {
      steamid: string;
      avatar: string;
      personaname: string;
    }[];
  };
};

const playerSummariesEndpoint = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";

export const steamUsers = {
  async getUsersAsync(steamId64s: string[]): Promise<Map<string, SteamUser>> {
    const players = await getPlayerSummariesAsync(steamId64s);
    const users = players.map((p) => ({
      steamId64: p.steamid,
      name: p.personaname,
      avatar: p.avatar,
    }));

    checkAllUsersFound(steamId64s, users);
    return new Map(users.map((u) => [u.steamId64, u]));
  },

  async getUserAsync(steamId64: string): Promise<SteamUser> {
    return (await this.getUsersAsync([steamId64])).values().next().value!;
  },
};

function checkAllUsersFound(steamId64s: string[], foundUsers: SteamUser[]) {
  const foundIds = foundUsers.map((u) => u.steamId64);
  const notFoundIds = steamId64s.filter((id) => !foundIds.includes(id));
  if (notFoundIds.length > 0) {
    throw new SteamUsersNotFoundError(notFoundIds);
  }
}

async function getPlayerSummariesAsync(steamId64s: string[]) {
  if (steamId64s.length === 0) {
    return [];
  }

  try {
    const url = `${playerSummariesEndpoint}?${getUrlParams(steamId64s)}`;
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    const data = (await resp.json()) as SteamPlayerSummaries;
    return data.response.players;
  } catch {
    throw new SteamFailedError("Steam API is down");
  }
}

function getUrlParams(steamId64s: string[]) {
  const params = new URLSearchParams({
    key: envConfig.STEAM_API_KEY,
    steamids: steamId64s.join(","),
  });

  return params;
}
