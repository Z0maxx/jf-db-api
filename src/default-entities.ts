import { Loaded } from "@mikro-orm/core";

import { claimNames } from "./claim-names";
import { ctx } from "./db-context";
import { Claim } from "./db-entities/Claim";
import { Division, DivisionType } from "./db-entities/Division";
import { Role } from "./db-entities/Role";

export let headAdminRole: Loaded<Role, "claimCollection"> = null!;
export let userRole: Loaded<Role, "claimCollection"> = null!;

export let unassignedSoldierDivision: Division = null!;
export let unassignedDemomanDivision: Division = null!;

export async function seedEntitiesAsync() {
  ctx.orm.em = ctx.orm.em.fork();
  const claims: Claim[] = await ctx.claims.findAll();
  const missingClaims = claimNames.filter((cn) => !claims.some((c) => c.name !== cn));
  if (missingClaims.length > 0) {
    claims.push(...missingClaims.map((name) => ctx.claims.create({ name })));
  }

  userRole = (await ctx.roles.findOne({ name: "user" }))!;
  if (!userRole) {
    ctx.roles.create({ name: "user", level: 9999 });
    await ctx.saveAsync();
    userRole = await ctx.roles.findOneOrFail({ name: "user" });
  }

  userRole.claimCollection.set([]);

  headAdminRole = (await ctx.roles.findOne({ name: "head admin" }))!;
  if (!headAdminRole) {
    ctx.roles.create({ name: "head admin", level: 0 });
    await ctx.saveAsync();
    headAdminRole = await ctx.roles.findOneOrFail({ name: "head admin" });
  }

  headAdminRole.claimCollection.set(claims);

  unassignedSoldierDivision = (await ctx.divisions.findOne({ name: "Unassigned Soldier" }))!;
  if (!unassignedSoldierDivision) {
    ctx.divisions.create({
      type: DivisionType.SOLDIER,
      name: "Unassigned Soldier",
      color: "FFFFFF",
    });

    await ctx.saveAsync();
    unassignedSoldierDivision = await ctx.divisions.findOneOrFail({ name: "Unassigned Soldier" });
  }

  unassignedDemomanDivision = (await ctx.divisions.findOne({ name: "Unassigned Demoman" }))!;
  if (!(await ctx.divisions.findOne({ name: "Unassigned Demoman" }))) {
    ctx.divisions.create({
      type: DivisionType.DEMOMAN,
      name: "Unassigned Demoman",
      color: "FFFFFF",
    });

    await ctx.saveAsync();
    unassignedDemomanDivision = await ctx.divisions.findOneOrFail({ name: "Unassigned Demoman" });
  }
}