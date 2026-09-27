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
  let PatternSteamID64 = /7656([0-9]{12,14})/; // 76561198000836895 number starting with 7656 (SID32_1) and has 12-14 more numbers after (SID64_2)
  if (PatternSteamID64.test(steamId)) {
    return steamId;
  }

  let SID64_1 = "7656"; //Starting Steam ID is 76561197960265728 (javascript cant handle numbers that big, so i took firt 4 digits out) and use them as a string
  let SID64_S = Number(1197960265728); //the rest of the digits from the Starting Steam ID (to calculate with) after calculations the remaining numbers will be SID64_2

  let isSteamID = false; //prepare in case that its not a steamid

  let PatternSteam3ID = /^\[([Ug]):([0-9]):([0-9]+)\]$/; // [U:1:40571167] [letter:number:longer_number]
  let PatternSteamID32 = /^STEAM_([0-9]):([0-9]):([0-9]+)$/; // STEAM_0:1:20285583 //find a string starting with STEAM_number:number:longer_number

  let S3ID_1;
  let S3ID_2;
  let S3ID_3 = 0;

  let SID32_1;
  let SID32_2;
  let SID32_3;

  let SID64_2;

  if (PatternSteam3ID.test(steamId)) {
    // [U:1:40571167]
    let Steam3ID = PatternSteam3ID.exec(steamId)!;
    S3ID_1 = Steam3ID[1];
    S3ID_2 = Number(Steam3ID[2]);
    S3ID_3 = Number(Steam3ID[3]);
    SID64_2 = S3ID_3 + SID64_S;
    isSteamID = true;
  } else if (PatternSteamID32.test(steamId)) {
    // STEAM_0:1:20285583
    let SteamID32 = PatternSteamID32.exec(steamId);
    SID32_1 = Number(SteamID32![1]);
    SID32_2 = Number(SteamID32![2]);
    SID32_3 = Number(SteamID32![3]);
    S3ID_3 = SID32_3 * 2 + SID32_2;
    SID64_2 = S3ID_3 + SID64_S;
    isSteamID = true;
  }

  if (isSteamID) {
    //handle SteamIDs
    let SID64 = SID64_1 + SID64_2;

    return SID64;
  } else {
    return null;
  }
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
