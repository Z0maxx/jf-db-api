import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { Division, DivisionType } from "#/db-entities/Division";
import { UserTempusIdStatus } from "#/db-entities/User";
import { userRole } from "#/default-entities";
import { DivisionsNotFoundError } from "#/divisions/divisions.errors";
import { UserNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";
import { divisionTypeValidator } from "#/users/validators/division-type.validator";

import {
  testDemomanDivision,
  testHeadAdmin,
  testSoldierDivision,
  testUser1,
} from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

let otherSoldierDivision: Division = null!;
let otherDemomanDivision: Division = null!;

function request(userDivisions?: object) {
  const req = supertest(app).post("/users/set-divisions");
  return userDivisions === undefined ? req : req.send(userDivisions);
}

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
      description: "description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
    });
    entities.push(allOutEvent);
    await ctx.allOut.stage1Maps.upsertMany([
      {
        name: "stage 1 soldier map",
        timeLimit: 10,
        event: allOutEvent,
        division: testSoldierDivision,
      },
      {
        name: "stage 1 demoman map",
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
    const allOutParticipant = await ctx.allOut.participants.upsert({
      event: allOutEvent,
      user,
    });
    allOutParticipant.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    await ctx.saveAsync();
    const monthlyEvent = await ctx.monthlies.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(monthlyEvent);
    await ctx.monthlies.maps.upsertMany([
      {
        name: "solider map",
        event: monthlyEvent,
        division: testSoldierDivision,
      },
      {
        name: "other solider map",
        event: monthlyEvent,
        division: otherSoldierDivision,
      },
    ]);
    const monthlyParticipant = await ctx.monthlies.participants.upsert({
      event: monthlyEvent,
      division: testSoldierDivision,
      user,
    });
    entities.push(user);

    const userDivisions = {
      userId: user.id,
      soldierDivisionId: otherSoldierDivision.id,
      demomanDivisionId: otherDemomanDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(userDivisions));

    assert(res.ok);
    await user.divisionCollection.load({ refresh: true });
    await allOutParticipant.divisionCollection.load({ refresh: true });
    await monthlyParticipant.division.load({ refresh: true });
    assert.deepStrictEqual(
      user.divisionCollection.map((d) => d.id),
      [otherSoldierDivision.id, otherDemomanDivision.id],
    );
    assert.deepStrictEqual(
      allOutParticipant.divisionCollection.map((d) => d.id),
      [otherSoldierDivision.id, otherDemomanDivision.id],
    );
    assert.equal(monthlyParticipant.division.id, otherSoldierDivision.id);
  });

  it("doesn't set past participation divisions", async () => {
    const user = await ctx.users.upsert({
      steam64Id: "76561198045909876",
      tempusIdStatus: UserTempusIdStatus.UNSET,
      role: userRole,
    });
    user.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    const allOutEvent = await ctx.allOut.events.upsert({
      description: "description",
      stage1Start: new Date(`${yesterday} 10:00`),
      stage1End: new Date(`${yesterday} 11:00`),
      stage2Start: new Date(`${yesterday} 12:00`),
      stage2End: new Date(`${yesterday} 13:00`),
      stage3Start: new Date(`${yesterday} 14:00`),
      stage3End: new Date(`${yesterday} 15:00`),
    });
    entities.push(allOutEvent);
    await ctx.allOut.stage1Maps.upsertMany([
      {
        name: "stage 1 soldier map",
        timeLimit: 10,
        event: allOutEvent,
        division: testSoldierDivision,
      },
      {
        name: "stage 1 demoman map",
        timeLimit: 11,
        event: allOutEvent,
        division: testDemomanDivision,
      },
    ]);
    const allOutParticipant = await ctx.allOut.participants.upsert({
      event: allOutEvent,
      user,
    });
    allOutParticipant.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
    await ctx.saveAsync();
    const monthlyEvent = await ctx.monthlies.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
    });
    entities.push(monthlyEvent);
    await ctx.monthlies.maps.upsertMany([
      {
        name: "soldier map",
        event: monthlyEvent,
        division: testSoldierDivision,
      },
    ]);
    const monthlyParticipant = await ctx.monthlies.participants.upsert({
      event: monthlyEvent,
      division: testSoldierDivision,
      user,
    });
    entities.push(user);

    const userDivisions = {
      userId: user.id,
      soldierDivisionId: otherSoldierDivision.id,
      demomanDivisionId: otherDemomanDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(userDivisions));

    assert(res.ok);
    await user.divisionCollection.load({ refresh: true });
    await allOutParticipant.divisionCollection.load({ refresh: true });
    await monthlyParticipant.division.load({ refresh: true });
    assert.deepStrictEqual(
      user.divisionCollection.map((d) => d.id),
      [otherSoldierDivision.id, otherDemomanDivision.id],
    );
    assert.deepStrictEqual(
      allOutParticipant.divisionCollection.map((d) => d.id),
      [testSoldierDivision.id, testDemomanDivision.id],
    );
    assert.equal(monthlyParticipant.division.id, testSoldierDivision.id);
  });

  it("returns validation error when divisions are not correct type", async () => {
    const userDivisions = {
      userId: testUser1.id,
      soldierDivisionId: testDemomanDivision.id,
      demomanDivisionId: testSoldierDivision.id,
    };
    const res = await loginAs(testHeadAdmin, request(userDivisions));

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
    const res = await loginAs(testHeadAdmin, request(userDivisions));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new UserNotFoundError(200_000)));
  });

  it("returns divisions not found error when divisions don't exist", async () => {
    const userDivisions = {
      userId: testUser1.id,
      soldierDivisionId: 200_001,
      demomanDivisionId: 200_002,
    };

    const res = await loginAs(testHeadAdmin, request(userDivisions));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new DivisionsNotFoundError([200_001, 200_002])));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request();

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user cannot manage user divisions", async () => {
    const res = await loginAs(testUser1, request());

    assert.equal(res.status, 403);
  });
});
