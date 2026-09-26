import { User, UserTempusIdStatus } from "#/db-entities/User";
import { steamUsersService } from "#/steam/steam-users.service";
import { verifyTempusIdAsync } from "#/tempus/tempus-id-verifier.service";
import { AppUser } from "#/types";
import { convertToSteam64Id, getAppUser } from "#/util";

import { usersRepository } from "./users.repository";

export const usersService = {
  async queryUsersAsync(steamId?: string): Promise<AppUser[]> {
    if (steamId) {
      const steam64Id = convertToSteam64Id(steamId);
      if (!steam64Id) {
        return []
      }

      const user = await usersRepository.getUserBySteamIdAsync(steam64Id);
      if (!user) {
        return []
      }

      const steamUser = await steamUsersService.getUserAsync(steam64Id);
      return [getAppUser(user, steamUser)]
    }

    const users = await usersRepository.getAllUsersAsync();
    const steamUsers = await steamUsersService.getUsersAsync(users.map((u) => u.steam64Id));
    return users.map((u) => getAppUser(u, steamUsers.get(u.steam64Id)!))
  },

  async verifyAndSetTempusIdAsync(user: User, tempusId: number) {
    const status = await verifyTempusIdAsync({ steam64Id: user.steam64Id, tempusId })
    if (status === UserTempusIdStatus.FAILED) {
      usersRepository.setTempusIdStatus(user, status)
    }
    else {
      usersRepository.setTempusIdAsync(user, tempusId)
    }
  }
};