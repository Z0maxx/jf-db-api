import { app } from "#/app";
import { authService } from "#/auth/auth.service";
import { ctx, initCtx } from "#/db-context";
import { UserTempusIdStatus } from "#/db-entities/User";
import { TempusIdVerificationResult } from "#/types";
import { BaseEntity } from "@mikro-orm/core";
import { Server } from "node:http";
import { afterAll, afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";

import { getSingleSseResponseAsync, teardownApiTestSuiteAsync } from "../util";
import { Role } from "#/db-entities/Role";
import { AlreadySetTempusIdError } from "#/errors";

const entities: BaseEntity[] = [];
let userRole: Role = null!
describe("POST /users/tempus-id", () => {
  let server: Server;

  beforeAll(async () => {
    
  })

  beforeEach(async () => {
    await initCtx();
    ctx.orm.em = ctx.orm.em.fork();
    if (!userRole) {
      userRole = await ctx.roles.findOneOrFail({ name: "user" });
    }

    server = await new Promise<Server>((res) => {
      const s = app.listen(4000, () => {
        res(s);
      });
    });
  });

  afterEach(async () => {
    server.close();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("sets tempus id when successfully verified and sends SSE of verified status", async () => {
    const tempusId = 257379;
    const user = await ctx.users.upsert({
      steam64Id: "76561198202756431",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: userRole,
    });
    entities.push(user);

    const res = await getSingleSseResponseAsync<TempusIdVerificationResult>({
      url: "http://localhost:4000/users/tempus-id",
      method: "POST",
      body: { tempusId },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authService.getToken({ id: user.id }),
      }
    })

    assert.deepStrictEqual(res, {
      status: UserTempusIdStatus.VERIFIED,
      tempusId,
    });
    assert.equal(user.tempusId, tempusId)
    assert.equal(user.tempusIdStatus, UserTempusIdStatus.VERIFIED)
  });

  it("does not set tempus id when tempus id does not belong to user and sends SSE of failed status", async () => {
    const tempusId = 111;
    const user = await ctx.users.upsert({
      steam64Id: "76561198311745679",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: userRole,
    });
    entities.push(user);

    const res = await getSingleSseResponseAsync<TempusIdVerificationResult>({
      url: "http://localhost:4000/users/tempus-id",
      method: "POST",
      body: { tempusId },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authService.getToken({ id: user.id }),
      }
    })

    assert.deepStrictEqual(res, {
      status: UserTempusIdStatus.FAILED,
      tempusId,
    });
    assert.isNull(user.tempusId)
    assert.equal(user.tempusIdStatus, UserTempusIdStatus.FAILED)
  });

  it("returns already set tempus id error when user has tempus id", async () => {
    const tempusId = 25478;
    const user = await ctx.users.upsert({
      steam64Id: "64578234976127523",
      tempusId,
      tempusIdStatus: UserTempusIdStatus.VERIFIED,
      role: userRole,
    });
    entities.push(user);

    const res = await getSingleSseResponseAsync<{ errorCode: string, errorMessage: string }>({
      url: "http://localhost:4000/users/tempus-id",
      method: "POST",
      body: { tempusId },
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + authService.getToken({ id: user.id }),
      }
    })

    assert.deepStrictEqual(res, {
      errorCode: "AlreadySetTempusIdError",
      errorMessage: new AlreadySetTempusIdError(user).message
    });
  })
});
