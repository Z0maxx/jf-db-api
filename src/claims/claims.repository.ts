import { ctx } from "#/db-context";

export const claimsRepository = {
  async getAllClaimsAsync() {
    return await ctx.claims.findAll();
  },

  async getClaimsByIdAsync(claimIds: number[]) {
    return await ctx.claims.find({ id: { $in: claimIds } });
  },
};
