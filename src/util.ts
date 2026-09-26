import { Loaded } from "@mikro-orm/core";

import { User } from "./db-entities/User";
import { AppUser, SteamUser } from "./types";

export function getDuplicates<T>(items: T[], groupFn: (item: T) => string | number) {
  const groups = Object.groupBy(items, groupFn);
  return Object.values(groups)
    .filter((list) => list!.length > 1)
    .map((list) => list![0]);
}

export function convertToSteam64Id(steamId: string) {
  const steam64Id = steamId.match(/^(\d{17})$/)?.[1];
  const accountId = steamId.match(/^\[?U:1:(\d+)\]?$/i)?.[1];
  const steam2Id = steamId.match(/^STEAM_[01]:([01]):(\d+)$/i);
  const accountIdText = accountId ?? steam2Id?.[3];

  if (steam64Id) {
    return steam64Id;
  }

  if (!accountIdText || (steam2Id && !steam2Id[1])) {
    return null;
  }

  const accountIdNumber = BigInt(accountIdText);
  const maxAccountId = 2n ** 32n - 1n;
  if (accountIdNumber > maxAccountId) {
    return null;
  }

  const authCode = steam2Id ? BigInt(steam2Id[2]) : 0n;
  return (76561197960265728n + accountIdNumber * 2n + authCode).toString();
}

export function getAppUser(
  user: Loaded<User, "role.claimCollection" | "divisionCollection">,
  steamUser: SteamUser,
): AppUser {
  return {
    ...steamUser,
    id: user.id,
    tempusId: user.tempusId,
    tempusIdStatus: user.tempusIdStatus,
    role: user.role.$.name,
    claims: user.role.$.claimCollection.$.map((c) => c.name),
    divisions: user.divisionCollection.$.map(({ type, name, color }) => ({ type, name, color })),
  };
}
