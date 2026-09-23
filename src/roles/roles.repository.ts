import { ctx } from "#/db-context";
import { Claim } from "#/db-entities/Claim";
import { CreateRoleDto } from "#/types";
import { wrap } from "@mikro-orm/core";

export const rolesRepository = {
  async getAllRolesAsync() {
    return await ctx.roles.findAll({ populate: ["claimCollection"] });
  },

  async getDefaultRolesAsync() {
    return await ctx.roles.find(
      { name: { $in: ["head admin", "user"] } },
      { populate: ["claimCollection"] },
    );
  },

  async getRolesByNameAsync(roleNames: string[]) {
    return await ctx.roles.find({ name: { $in: roleNames } }, { populate: ["userCollection"] });
  },

  async setRolesAsync(roles: CreateRoleDto[]) {
    const claims = await ctx.claims.findAll();
    const claimsMap = new Map<number, Claim>(claims.map((c) => [c.id, c]));
    const rolesMap = new Map<string, CreateRoleDto>(roles.map((r) => [r.name, r]));
    const existing = await this.getAllRolesAsync();
    const deleted = existing.filter((e) => !rolesMap.get(e.name));
    deleted.forEach((r) => ctx.em.remove(r));
    const updated = existing.filter((e) => !deleted.includes(e));
    updated.forEach((u) => {
      const role = rolesMap.get(u.name)!;
      const roleClaims = role.claimIds.map((cId) => claimsMap.get(cId)!);
      wrap(u).assign({
        name: role.name,
      });

      u.claimCollection.set(roleClaims);
      rolesMap.delete(u.name);
    });

    const created = rolesMap.values().map((r) => {
      const createdRole = ctx.roles.create({
        name: r.name,
      });

      const roleClaims = r.claimIds.map((cId) => claimsMap.get(cId)!);
      createdRole.claimCollection.set(roleClaims);
      return createdRole;
    });

    await ctx.saveAsync();
    return [...created, ...updated];
  },
};
