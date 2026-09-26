import { ctx } from "#/db-context";
import { TUserTempusIdStatus, User, UserTempusIdStatus } from "#/db-entities/User";

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
    const role = await ctx.roles.findOne({ name: "user" });
    if (!role) {
      throw new Error("User role must exist");
    }

    const user = ctx.users.create({
      tempusIdStatus: UserTempusIdStatus.UNSET,
      steam64Id,
      role,
    });

    const divisions = await ctx.divisions.find({
      name: { $in: ["Unassigned Soldier", "Unassigned Demoman"] },
    });
    if (divisions.length < 2) {
      throw new Error("Unassigned divisions must exist");
    }

    user.divisionCollection.set(divisions);
    await ctx.saveAsync();
    return (await this.getUserBySteamIdAsync(user.steam64Id))!;
  },

  async setTempusIdAsync(user: User, tempusId: number) {
    user.tempusId = tempusId;
    user.tempusIdStatus = UserTempusIdStatus.VERIFIED;
    await ctx.saveAsync();
  },

  async setTempusIdStatus(user: User, status: Exclude<TUserTempusIdStatus, 'verified'>) {
    user.tempusIdStatus = status
    await ctx.saveAsync()
  },
};
