import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { app } from "#/app";
import { testHeadAdmin, testUser1 } from "../test-entities";
import { ctx } from "#/db-context";
import { BaseEntity } from "@mikro-orm/core";
import { roleDuplicateValidator } from "#/roles/validators/role-duplicate.validator";
import { roleDuplicateClaimValidator } from "#/roles/validators/role-duplicate-claim.validator";
import {
  ClaimsNotFoundError,
  DefaultEntitiesModifiedError,
  DefaultRolesDeletedError,
  DefaultRolesModifiedError,
  RolesHaveUsersError,
} from "#/errors";

const entities: BaseEntity[] = [];
describe("POST /roles", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("sets roles", async () => {
    const [roleToDelete, roleToUpdate] = await ctx.roles.upsertMany([
      {
        name: "role to delete",
      },
      {
        name: "role to update",
      },
    ]);
    entities.push(roleToUpdate);
    const manageEventsClaim = await ctx.claims.findOneOrFail({ name: "manage events" });
    roleToUpdate.claimCollection.set([manageEventsClaim]);
    await ctx.saveAsync();
    const roleToCreate = {
      name: "role to create",
      claimIds: [manageEventsClaim.id],
    };
    const otherRoles = (await ctx.roles.findAll({ populate: ["claimCollection"] })).filter(
      (d) => ![roleToCreate.name, roleToUpdate.name, roleToDelete.name].includes(d.name),
    );
    const roles = [
      ...otherRoles.map(({ name, claimCollection }) => ({
        name,
        claimIds: claimCollection.map((c) => c.id),
      })),
      roleToCreate,
      {
        name: roleToUpdate.name,
        claimIds: [],
      },
    ];

    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send(roles);

    assert.equal(res.status, 204);
    const deletedRole = await ctx.roles.findOne({ id: roleToDelete.id });
    assert.notExists(deletedRole?.id);
    assert.isEmpty(roleToUpdate!.serialize().claimCollection);
    const createdRole = await ctx.roles.findOne({ name: roleToCreate.name });
    assert.isNotNull(createdRole);
    entities.push(createdRole);
    assert.containsSubset(createdRole.serialize(), {
      name: roleToCreate.name,
      claimCollection: [manageEventsClaim.id],
    });
  });

  it("returns validation error when there are multiple roles with same name", async () => {
    const role = {
      name: "duplicate role",
      claimIds: [],
    };

    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send([role, role]);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: roleDuplicateValidator.getMessages([role.name]),
    });
  });

  it("returns validation error when a role has duplicate claim ids", async () => {
    const role = {
      name: "role with duplicate clam ids",
      claimIds: [1, 1],
    };

    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send([role]);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: roleDuplicateClaimValidator.getMessages([
        { role: role.name, duplicateClaims: [1] },
      ]),
    });
  });

  it("returns default roles deleted error when trying to delete default roles", async () => {
    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send([]);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "DefaultRolesDeletedError",
      errorMessages: new DefaultRolesDeletedError(["head admin", "user"]).messages,
    });
  });

  it("returns default roles modified error when trying to modify default roles", async () => {
    const manageEventsClaim = await ctx.claims.findOneOrFail({ name: "manage events" });
    const roles = [
      {
        name: "head admin",
        claimIds: [],
      },
      {
        name: "user",
        claimIds: [manageEventsClaim.id],
      },
    ];

    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send(roles);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "DefaultRolesModifiedError",
      errorMessages: new DefaultRolesModifiedError(["head admin", "user"]).messages,
    });
  });

  it("returns roles have users error when trying to delete a role with users", async () => {
    const role = await ctx.roles.upsert({ name: "role with users" });
    const user = await ctx.users.upsert({ steamId64: "1".repeat(17), tempusId: 0, role });
    entities.push(user);
    entities.push(role);
    const otherRoles = (await ctx.roles.findAll())
      .filter((r) => r.name !== role.name)
      .map(({ name, claimCollection }) => ({ name, claimIds: claimCollection.map((c) => c.id) }));

    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send(otherRoles);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "RolesHaveUsersError",
      errorMessages: new RolesHaveUsersError([role.name]).messages,
    });
  });

  it("returns claims not found error when a role has not existing claim ids", async () => {
    const role = { name: "role with missing claim", claimIds: [200_000] };

    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send([role]);

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "ClaimsNotFoundError",
      errorMessages: new ClaimsNotFoundError([200_000]).messages,
    });
  });

  it("returns bad request when body in incorrect", async () => {
    const res = await loginAs(request(app).post("/roles"), testHeadAdmin).send([{}]);

    assert.equal(res.status, 400)
  })

  it("returns forbidden when the user cannot manage roles", async () => {
      const res = await loginAs(request(app).post("/roles"), testUser1).send([]);
  
      assert.equal(res.statusCode, 403);
    });
  
    it("returns unauthorized when user is not logged in", async () => {
      const res = await request(app).post("/roles").send([]);
  
      assert.equal(res.statusCode, 401);
    });
});
