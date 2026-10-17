import { UserTempusIdStatus } from "#/db-entities/User";
import { convertToSteam64Id } from "#/util";

import { fetchTempusApiAsync } from "./tempus-fetch";

type TempusUser = {
  steam64Id: string;
  tempusId: number;
};

type TempusPlayerInfo = {
  id: number;
  steamid: string;
};

export async function verifyTempusIdAsync(user: TempusUser) {
  const response = await fetchTempusApiAsync(
    `https://tempus2.xyz/api/v0/players/id/${user.tempusId}/info`,
  );
  if (response.status === 404) {
    return UserTempusIdStatus.FAILED;
  }

  const playerInfo = (await response.json()) as TempusPlayerInfo;
  if (convertToSteam64Id(playerInfo.steamid) === user.steam64Id) {
    return UserTempusIdStatus.VERIFIED;
  }

  return UserTempusIdStatus.FAILED;
}
