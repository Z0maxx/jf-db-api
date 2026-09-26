import { envConfig } from "#/env-config";
import { SteamFailedError, SteamUsersNotFoundError } from "#/errors";
import { SteamUser } from "#/types";

type SteamPlayerSummary = {
  steamid: string;
  avatar: string;
  personaname: string;
};

type SteamPlayerSummaries = {
  response: {
    players: SteamPlayerSummary[];
  };
};

type SteamUserCacheItem = SteamUser & {
  lastUpdated: Date;
};

const cache = new Map<string, SteamUserCacheItem>();
const secondsInDay = 60 * 60 * 24;
const steamIdsPerRequest = 100;
const playerSummariesEndpoint = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";

export const steamUsersService = {
  async getUsersAsync(steam64Ids: string[]): Promise<Map<string, SteamUser>> {
    const users = getUsersFromCache(steam64Ids);
    const notInCache = steam64Ids.filter((id) => !users.has(id));
    const playerSummaries = await getPlayerSummariesAsync(notInCache);
    const newUsers = playerSummaries.map((p) => ({
      steam64Id: p.steamid,
      name: p.personaname,
      avatar: p.avatar,
    }));

    const now = new Date();
    newUsers.forEach((u) => {
      users.set(u.steam64Id, u);
      cache.set(u.steam64Id, {
        ...u,
        lastUpdated: now,
      });
    });

    checkAllUsersFound(notInCache, newUsers);
    return users;
  },

  async getUserAsync(steam64Id: string): Promise<SteamUser> {
    return (await this.getUsersAsync([steam64Id])).values().next().value!;
  },
};

function checkAllUsersFound(steam64Ids: string[], foundUsers: SteamUser[]) {
  const foundIds = foundUsers.map((u) => u.steam64Id);
  const notFoundIds = steam64Ids.filter((id) => !foundIds.includes(id));
  if (notFoundIds.length > 0) {
    throw new SteamUsersNotFoundError(notFoundIds);
  }
}

function getUsersFromCache(steam64Ids: string[]): Map<string, SteamUser> {
  console.log("cahce------------------------", cache);
  const now = new Date();
  const users = new Map<string, SteamUser>();
  steam64Ids.forEach((id) => {
    const user = cache.get(id);
    if (user && (now.valueOf() - user.lastUpdated.valueOf()) / 1000 < secondsInDay) {
      const copy = JSON.parse(JSON.stringify(user));
      delete copy.lastUpdated;
      users.set(id, copy);
    }
  });

  return users;
}

async function getPlayerSummariesAsync(steam64Ids: string[]) {
  if (steam64Ids.length === 0) {
    return [];
  }

  const summaries: SteamPlayerSummary[] = [];
  let chunk: string[] = [];
  let i = 0;
  do {
    chunk = steam64Ids.slice(i * steamIdsPerRequest, (i + 1) * steamIdsPerRequest);
    i++;
    try {
      const url = `${playerSummariesEndpoint}?${getUrlParams(chunk)}`;
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      const data = (await resp.json()) as SteamPlayerSummaries;
      summaries.push(...data.response.players);
    } catch {
      throw new SteamFailedError("Steam API is down");
    }
  } while (chunk.length > 0);

  return summaries;
}

function getUrlParams(steam64Ids: string[]) {
  const params = new URLSearchParams({
    key: envConfig.STEAM_API_KEY,
    steamids: steam64Ids.join(","),
  });

  return params;
}
