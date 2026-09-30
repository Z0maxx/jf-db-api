import { ctx } from "#/db-context";
import { DivisionType, TDivisionType } from "#/db-entities/Division";
import { DivisionDto, DivisionsListDto } from "#/types";
import { wrap } from "@mikro-orm/core";

export const divisionsRepository = {
  async getAllDivisionsAsync() {
    return await ctx.divisions.findAll();
  },

  async divisionExistsAsync(name: string) {
    return (await ctx.divisions.findOne({ name })) !== null;
  },

  async getDivisionByIdAsync(divisionId: number) {
    return await ctx.divisions.findOne({ id: divisionId });
  },

  async getDivisionsByNameAsync(divisionNames: string[]) {
    return await ctx.divisions.find(
      { name: { $in: divisionNames } },
      { populate: ["userCollection"] },
    );
  },

  async setDivisionsAsync(divisions: DivisionsListDto) {
    const divisionsMap = new Map<string, DivisionDto & { type: TDivisionType }>([
      ...divisions.soldier.map((d) => [d.name, { ...d, type: DivisionType.SOLDIER }] as const),
      ...divisions.demoman.map((d) => [d.name, { ...d, type: DivisionType.DEMOMAN }] as const),
    ]);

    const existing = await this.getAllDivisionsAsync();
    const deleted = existing.filter((e) => !divisionsMap.get(e.name));
    deleted.forEach((r) => ctx.em.remove(r));
    const updated = existing.filter((e) => !deleted.includes(e));
    updated.forEach((u) => {
      wrap(u).assign(divisionsMap.get(u.name)!);
      divisionsMap.delete(u.name);
    });

    divisionsMap.values().forEach((d) => ctx.divisions.create(d));
    await ctx.saveAsync();
  },
};
