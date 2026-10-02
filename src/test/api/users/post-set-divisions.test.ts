import { app } from "#/app";
import { ctx } from "#/db-context";
import { Division, DivisionType } from "#/db-entities/Division";
import { UserTempusIdStatus } from "#/db-entities/User";
import { userRole } from "#/default-entities";
import { DivisionsNotFoundError, UserNotFoundError } from "#/errors";
import { tomorrow, yesterday } from "#/test/test-dates";
import { divisionTypeValidator } from "#/users/validators/division-type.validator";
import { BaseEntity } from "@mikro-orm/core";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import {
  testDemomanDivision,
  testHeadAdmin,
  testSoldierDivision,
  testUser1,
} from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

let otherSoldierDivision: Division = null!;
let otherDemomanDivision: Division = null!;
const entities: BaseEntity[] = [];
describe("POST /users/set-divisions", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
    [otherSoldierDivision, otherDemomanDivision] = await ctx.divisions.upsertMany([
      {
        type: DivisionType.SOLDIER,
        name: "other soldier division",
        color: "121212",
      },
      {
        type: DivisionType.DEMOMAN,
        name: "other demoman division",
        color: "212121",
      },
    ]);
  });

  afterAll(async () => {
    entities.push(otherSoldierDivision, otherDemomanDivision);
    await teardownApiTestSuiteAsync(entities);
  });

  it("sets user's divisions and upcoming participation divisions", async () => {
    const user = await ctx.users.upsert({
      steam64Id: "76561198023454374",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: userRole,
    });
    user.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    const allOutEvent = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
    });
    await ctx.allOut.stage1Maps.upsertMany([
      {
        name: "test stage 1 soldier map",
        timeLimit: 10,
        event: allOutEvent,
        division: testSoldierDivision,
      },
      {
        name: "test stage 1 demoman map",
        timeLimit: 11,
        event: allOutEvent,
        division: testDemomanDivision,
      },
      {
        name: "other stage 1 soldier map",
        timeLimit: 12,
        event: allOutEvent,
        division: otherSoldierDivision,
      },
      {
        name: "other stage 1 demoman map",
        timeLimit: 13,
        event: allOutEvent,
        division: otherDemomanDivision,
      },
    ]);
    const participant = await ctx.allOut.participants.upsert({
      event: allOutEvent,
      user,
    });
    participant.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    await ctx.saveAsync();
    entities.push(allOutEvent);
    entities.push(user);

    const userDivisions = {
      userId: user.id,
      soldierDivisionId: otherSoldierDivision.id,
      demomanDivisionId: otherDemomanDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(app).post("/users/set-divisions")).send(
      userDivisions,
    );

    assert(res.ok);
    await user.divisionCollection.load({ refresh: true });
    await participant.divisionCollection.load({ refresh: true });
    assert.deepStrictEqual(
      user.divisionCollection.map((d) => d.id),
      [otherSoldierDivision.id, otherDemomanDivision.id],
    );
    assert.deepStrictEqual(
      participant.divisionCollection.map((d) => d.id),
      [otherSoldierDivision.id, otherDemomanDivision.id],
    );
  });

  it("doesn't set past participation divisions", async () => {
    const user = await ctx.users.upsert({
      steam64Id: "76561198045909876",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: userRole,
    });
    user.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    const allOutEvent = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${yesterday} 10:00`),
      stage1End: new Date(`${yesterday} 11:00`),
      stage2Start: new Date(`${yesterday} 12:00`),
      stage2End: new Date(`${yesterday} 13:00`),
      stage3Start: new Date(`${yesterday} 14:00`),
      stage3End: new Date(`${yesterday} 15:00`),
    });
    await ctx.allOut.stage1Maps.upsertMany([
      {
        name: "test stage 1 soldier map",
        timeLimit: 10,
        event: allOutEvent,
        division: testSoldierDivision,
      },
      {
        name: "test stage 1 demoman map",
        timeLimit: 11,
        event: allOutEvent,
        division: testDemomanDivision,
      },
    ]);
    const participant = await ctx.allOut.participants.upsert({
      event: allOutEvent,
      user,
    });
    participant.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    await ctx.saveAsync();
    entities.push(allOutEvent);
    entities.push(user);

    const userDivisions = {
      userId: user.id,
      soldierDivisionId: otherSoldierDivision.id,
      demomanDivisionId: otherDemomanDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(app).post("/users/set-divisions")).send(
      userDivisions,
    );

    assert(res.ok);
    await user.divisionCollection.load({ refresh: true });
    await participant.divisionCollection.load({ refresh: true });
    assert.deepStrictEqual(
      user.divisionCollection.map((d) => d.id),
      [otherSoldierDivision.id, otherDemomanDivision.id],
    );
    assert.deepStrictEqual(
      participant.divisionCollection.map((d) => d.id),
      [testSoldierDivision.id, testDemomanDivision.id],
    );
  });

  it("returns validation error when divisions are not correct type", async () => {
    const userDivisions = {
      userId: testUser1.id,
      soldierDivisionId: testDemomanDivision.id,
      demomanDivisionId: testSoldierDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(app).post("/users/set-divisions")).send(
      userDivisions,
    );

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: divisionTypeValidator.getMessages([
        { divisionId: testDemomanDivision.id, divisionType: DivisionType.DEMOMAN },
        { divisionId: testSoldierDivision.id, divisionType: DivisionType.SOLDIER },
      ]),
    });
  });

  it("returns user not found error when user does not exist", async () => {
    const userDivisions = {
      userId: 200_000,
      soldierDivisionId: otherSoldierDivision.id,
      demomanDivisionId: otherDemomanDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(app).post("/users/set-divisions")).send(
      userDivisions,
    );

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "UserNotFoundError",
      errorMessage: new UserNotFoundError(200_000).message,
    });
  });

  it("returns divisions not found error when divisions don't exist", async () => {
    const userDivisions = {
      userId: testUser1.id,
      soldierDivisionId: 200_001,
      demomanDivisionId: 200_002,
    };

    const res = await loginAs(testHeadAdmin, request(app).post("/users/set-divisions")).send(
      userDivisions,
    );

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "DivisionsNotFoundError",
      errorMessages: new DivisionsNotFoundError([200_001, 200_002]).messages,
    });
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).post("/users/set-divisions").send();

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user cannot manage user divisions", async () => {
    const res = await loginAs(testUser1, request(app).post("/users/set-divisions")).send();

    assert.equal(res.status, 403);
  });
});
