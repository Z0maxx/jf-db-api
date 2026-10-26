import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { claimNames } from "#/claim-names";
import { ctx, initCtx } from "#/db-context";
import { DivisionType } from "#/db-entities/Division";
import { seedEntitiesAsync } from "#/default-entities";

const expectedClaimNames = [...claimNames].sort();

describe("seedEntitiesAsync", () => {
  beforeAll(async () => {
    await initCtx();
    await seedEntitiesAsync();
  });

  afterAll(async () => {
    await seedEntitiesAsync();
  });

  it("inserts only missing claims and flushes role links when defaults already exist", async () => {
    const keptName = "manage roles";
    const roles = await ctx.roles.findAll({ populate: ["claimCollection"] });
    for (const role of roles) {
      role.claimCollection.set([]);
    }
    await ctx.saveAsync();

    for (const claim of await ctx.claims.findAll()) {
      if (claim.name !== keptName) {
        ctx.em.remove(claim);
      }
    }
    await ctx.saveAsync();

    const keptClaim = await ctx.claims.findOneOrFail({ name: keptName });
    const user = await ctx.roles.findOneOrFail({ name: "user" }, { populate: ["claimCollection"] });
    const headAdmin = await ctx.roles.findOneOrFail(
      { name: "head admin" },
      { populate: ["claimCollection"] },
    );
    user.claimCollection.set([keptClaim]);
    headAdmin.claimCollection.set([]);
    await ctx.saveAsync();

    await seedEntitiesAsync();
    ctx.em.clear();

    const names = (await ctx.claims.findAll()).map((claim) => claim.name).sort();
    assert.deepEqual(names, expectedClaimNames);

    const userAfter = await ctx.roles.findOneOrFail(
      { name: "user" },
      { populate: ["claimCollection"] },
    );
    const headAdminAfter = await ctx.roles.findOneOrFail(
      { name: "head admin" },
      { populate: ["claimCollection"] },
    );
    assert.deepEqual(
      userAfter.claimCollection.map((claim) => claim.name),
      [],
    );
    assert.deepEqual(
      headAdminAfter.claimCollection.map((claim) => claim.name).sort(),
      expectedClaimNames,
    );

    const soldier = await ctx.divisions.findOneOrFail({ name: "Unassigned Soldier" });
    const demoman = await ctx.divisions.findOneOrFail({ name: "Unassigned Demoman" });
    assert.equal(soldier.type, DivisionType.SOLDIER);
    assert.equal(soldier.color, "FFFFFF");
    assert.equal(demoman.type, DivisionType.DEMOMAN);
    assert.equal(demoman.color, "FFFFFF");

    await seedEntitiesAsync();
    ctx.em.clear();
    const namesAfterSecondSeed = (await ctx.claims.findAll()).map((claim) => claim.name).sort();
    assert.deepEqual(namesAfterSecondSeed, expectedClaimNames);
  });
});
