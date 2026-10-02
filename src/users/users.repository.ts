import { ctx } from "#/db-context";
import { Role } from "#/db-entities/Role";
import { TUserTempusIdStatus, User, UserTempusIdStatus } from "#/db-entities/User";
import { unassignedDemomanDivision, unassignedSoldierDivision, userRole } from "#/default-entities";
import { UserDivisions } from "#/types";
import { ref } from "@mikro-orm/core";

export const usersRepository = {
  async getAllUsersAsync() {
    return await ctx.users.findAll({ populate: ["role.claimCollection", "divisionCollection"] });
  },

  async getUserBySteamIdAsync(steam64Id: string) {
    return await ctx.users.findOne(
      { steam64Id },
      { populate: ["divisionCollection", "role.claimCollection"] },
    );
  },

  async getUserByIdAsync(userId: number) {
    return await ctx.users.findOne(
      { id: userId },
      { populate: ["divisionCollection", "role.claimCollection"] },
    );
  },

  async createUserAsync(steam64Id: string) {
    const user = ctx.users.create({
      tempusIdStatus: UserTempusIdStatus.UNSET,
      steam64Id,
      role: userRole,
    });

    user.divisionCollection.set([unassignedSoldierDivision, unassignedDemomanDivision]);
    await ctx.saveAsync();
    return (await this.getUserBySteamIdAsync(user.steam64Id))!;
  },

  async setTempusIdAsync(user: User, tempusId: number) {
    user.tempusId = tempusId;
    user.tempusIdStatus = UserTempusIdStatus.VERIFIED;
    await ctx.saveAsync();
  },

  async setTempusIdStatus(user: User, status: Exclude<TUserTempusIdStatus, "verified">) {
    user.tempusIdStatus = status;
    await ctx.saveAsync();
  },

  async setUserDivisionsAsync(user: User, divisions: UserDivisions) {
    user.divisionCollection.set(Object.values(divisions));
    await ctx.saveAsync();
  },

  async setUserRoleAsync(user: User, role: Role) {
    user.role = ref(role);
    await ctx.saveAsync();
  },
};
