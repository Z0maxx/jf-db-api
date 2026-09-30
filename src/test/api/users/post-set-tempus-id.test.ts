import { app } from "#/app";
import { authService } from "#/auth/auth.service";
import { ctx } from "#/db-context";
import { Role } from "#/db-entities/Role";
import { UserTempusIdStatus } from "#/db-entities/User";
import { AlreadySetTempusIdError } from "#/errors";
import { BaseEntity } from "@mikro-orm/core";
import { Server } from "node:http";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testUser1 } from "../test-entities";
import {
  getSingleSseResponseAsync,
  setupApiTestSuiteAsync,
  teardownApiTestSuiteAsync,
} from "../util";

let server: Server;
let role: Role = null!;
const entities: BaseEntity[] = [];
describe("POST /users/set-tempus-id", () => {
  beforeAll(async () => {
    server = await new Promise<Server>((res) => {
      const s = app.listen(4000, () => {
        res(s);
      });
    });

    await setupApiTestSuiteAsync();
    role = await ctx.roles.findOneOrFail({ name: "user" });
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
    server.close()
  });

  it("sets tempus id when it belongs to user and sends SSE of verified status", async () => {
    const tempusId = 257379;
    const user = await ctx.users.upsert({
      steam64Id: "76561198202756431",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role,
    });
    entities.push(user);

    const res = await getSingleSseResponseAsync("http://localhost:4000/users/set-tempus-id", {
      method: "POST",
      body: { tempusId },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authService.getToken({ id: user.id }),
      },
    });

    assert.deepStrictEqual(res, {
      status: UserTempusIdStatus.VERIFIED,
      tempusId,
    });
    assert.equal(user.tempusId, tempusId);
    assert.equal(user.tempusIdStatus, UserTempusIdStatus.VERIFIED);
  });

  it("does not set tempus id when it does not belong to user and sends SSE of failed status", async () => {
    const tempusId = 111;
    const user = await ctx.users.upsert({
      steam64Id: "76561198311745679",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role,
    });
    entities.push(user);

    const res = await getSingleSseResponseAsync("http://localhost:4000/users/set-tempus-id", {
      method: "POST",
      body: { tempusId },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authService.getToken({ id: user.id }),
      },
    });

    assert.deepStrictEqual(res, {
      status: UserTempusIdStatus.FAILED,
      tempusId,
    });
    assert.isNull(user.tempusId);
    assert.equal(user.tempusIdStatus, UserTempusIdStatus.FAILED);
  });

  it("returns already set tempus id error when user has tempus id", async () => {
    const res = await getSingleSseResponseAsync("http://localhost:4000/users/set-tempus-id", {
      method: "POST",
      body: { tempusId: testUser1.tempusId },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authService.getToken({ id: testUser1.id }),
      },
    });

    assert.deepStrictEqual(res, {
      errorCode: "AlreadySetTempusIdError",
      errorMessage: new AlreadySetTempusIdError(testUser1).message,
    });
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).post("/users/set-tempus-id").send();

    assert.equal(res.statusCode, 401);
  });
});
