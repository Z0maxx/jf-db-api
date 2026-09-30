import { allOutRepository } from "#/all-out/all-out.repository";
import { Division } from "#/db-entities/Division";
import { User, UserTempusIdStatus } from "#/db-entities/User";
import { divisionsRepository } from "#/divisions/divisions.repository";
import {
  AlreadySetTempusIdError,
  DivisionsNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "#/errors";
import { steamService } from "#/steam/steam.service";
import { tempusService } from "#/tempus/tempus.service";
import { AppUser, LoadedUser, SetUserDivisions, UserDivisions } from "#/types";
import { convertToSteam64Id, getAppUser } from "#/util";

import { usersRepository } from "./users.repository";
import { divisionTypeValidator } from "./validators/division-type.validator";

export const usersService = {
  async queryUsersAsync(query: string): Promise<AppUser[]> {
    const steam64Id = convertToSteam64Id(query);
    if (steam64Id) {
      const user = await usersRepository.getUserBySteamIdAsync(steam64Id);
      if (!user) {
        return [];
      }

      const steamUser = await steamService.getUserAsync(steam64Id);
      return [getAppUser(user, steamUser)];
    }

    const users = await usersRepository.getAllUsersAsync();
    const steamUsers = await steamService.getUsersAsync(users.map((u) => u.steam64Id));
    return users
      .map((u) => getAppUser(u, steamUsers.get(u.steam64Id)!))
      .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));
  },

  async verifyAndSetTempusIdAsync(user: User, tempusId: number) {
    checkUserTempusIdNotSet(user);
    await usersRepository.setTempusIdStatus(user, UserTempusIdStatus.VERIFYING);
    const status = await tempusService.verifyTempusIdAsync({ steam64Id: user.steam64Id, tempusId });
    if (status === UserTempusIdStatus.FAILED) {
      await usersRepository.setTempusIdStatus(user, status);
    } else {
      await usersRepository.setTempusIdAsync(user, tempusId);
    }

    return status;
  },

  async setUserDivisionsAsync(setUserDivisions: SetUserDivisions) {
    const user = await getUserAsync(setUserDivisions.userId);
    const divisions = await getDivisionsAsync(setUserDivisions);
    validateDivisionTypes(divisions);
    await usersRepository.setUserDivisionsAsync(user, divisions);
    await updateUserParticipationsAsync(user);
  },
};

function checkUserTempusIdNotSet(user: User) {
  if (user.tempusId) {
    throw new AlreadySetTempusIdError(user);
  }
}

async function getUserAsync(userId: number) {
  const user = await usersRepository.getUserByIdAsync(userId);
  if (!user) {
    throw new UserNotFoundError(userId);
  }

  return user;
}

async function getDivisionsAsync({
  soldierDivisionId,
  demomanDivisionId,
}: {
  soldierDivisionId: number;
  demomanDivisionId: number;
}): Promise<UserDivisions> {
  const soldierDivision = await divisionsRepository.getDivisionByIdAsync(soldierDivisionId);
  const demomanDivision = await divisionsRepository.getDivisionByIdAsync(demomanDivisionId);
  const notFoundDivisions = [];
  if (!soldierDivision) {
    notFoundDivisions.push(soldierDivisionId);
  }

  if (!demomanDivision) {
    notFoundDivisions.push(demomanDivisionId);
  }

  if (notFoundDivisions.length > 0) {
    throw new DivisionsNotFoundError(notFoundDivisions);
  }

  return {
    soldierDivision: soldierDivision!,
    demomanDivision: demomanDivision!,
  };
}

function validateDivisionTypes(divisions: UserDivisions) {
  const errors: string[] = [];
  divisionTypeValidator.validate(errors, divisions);
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

async function updateUserParticipationsAsync(user: LoadedUser) {
  const now = new Date();
  //when monthlies is complete update them too
  const upcomingAllOutParticipations = await user.allOutParticipantCollection.loadItems({
    where: { event: { stage1Start: { $gt: now } } },
  });

  await Promise.all(
    upcomingAllOutParticipations.map(async (p) => {
      if (!(await allOutRepository.userHasEventDivisionsAsync(p.event.id, user))) {
        return allOutRepository.deleteRegistrationAsync({ user, eventId: p.event.id });
      } else {
        return allOutRepository.setParticipantDivisionsAsync(
          p,
          user.divisionCollection.$.getItems(),
        );
      }
    }),
  );
}
