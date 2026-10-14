import { app } from "#/app";
import { ctx } from "#/db-context";
import { UserTempusIdStatus } from "#/db-entities/User";
import { headAdminRole, userRole } from "#/default-entities";
import { CannotSetOwnRoleError, CannotSetRoleWithLevelError } from "#/users/users.errors";
import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testHeadAdmin } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(setUserRole?: object) {
  const req = supertest(app).post("/users/set-role");
  return setUserRole === undefined ? req : req.send(setUserRole);
}

const entities: BaseEntity[] = [];
describe("POST /users/set-role", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("sets user's role", async () => {
    const role = await ctx.roles.upsert({
      name: "role",
      level: 9999,
    });
    entities.push(role);
    const user = await ctx.users.upsert({
      steam64Id: "76561198048959371",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role,
    });
    entities.push(user);

    const setUserRole = {
      userId: user.id,
      roleId: userRole.id,
    };
    const res = await loginAs(testHeadAdmin, request(setUserRole));

    assert(res.ok);
    assert.equal(user.role.id, userRole.id);
  });

  it("returns cannot set own role error when admin tries to set their own role", async () => {
    const setUserRole = {
      userId: testHeadAdmin.id,
      roleId: userRole.id,
    };
    const res = await loginAs(testHeadAdmin, request(setUserRole));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "CannotSetOwnRoleError",
      errorMessage: new CannotSetOwnRoleError().message,
    });
  });

  it("returns cannot set role with level error when admin tries to set a user's role to one with same level as theirs", async () => {
    const user = await ctx.users.upsert({
      steam64Id: "76561198035005297",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: userRole,
    });
    entities.push(user);

    const setUserRole = {
      userId: user.id,
      roleId: headAdminRole.id,
    };
    const res = await loginAs(testHeadAdmin, request(setUserRole));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "CannotSetRoleWithLevelError",
      errorMessage: new CannotSetRoleWithLevelError().message,
    });
  });
});
