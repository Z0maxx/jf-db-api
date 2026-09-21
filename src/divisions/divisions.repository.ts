import { ctx } from "#/db-context";
import { DivisionDto } from "#/types";
import { wrap } from "@mikro-orm/core";

export const divisionsRepository = {
  async getAllDivisionsAsync() {
    return await ctx.divisions.findAll();
  },

  async divisionExistsAsync(name: string) {
    return (await ctx.divisions.findOne({ name })) !== null;
  },

  async getDivisionsWithUsers(divisionNames: string[]) {
    return await ctx.divisions.find(
      { name: { $in: divisionNames } },
      { populate: ["userCollection"] },
    );
  },

  async setDivisionsAsync(divisions: DivisionDto[]) {
    const divisionsMap = new Map<string, DivisionDto>(divisions.map((d) => [d.name, d]));
    const existingDivisions = await this.getAllDivisionsAsync();
    const deleted = existingDivisions.filter((e) => !divisionsMap.get(e.name));
    deleted.forEach((r) => ctx.em.remove(r));
    const updated = existingDivisions.filter((e) => !deleted.includes(e));
    updated.forEach((u) => {
      wrap(u).assign(divisionsMap.get(u.name)!);
      divisionsMap.delete(u.name);
    });

    divisionsMap.values().forEach((d) => ctx.divisions.create(d));
    await ctx.saveAsync();
  },
};
