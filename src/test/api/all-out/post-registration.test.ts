import { app } from "#/app";
import { ctx } from "#/db-context";
import {
  AlreadyRegisteredError,
  EventNotFoundError,
  EventStartedInPastError,
  NoMapsWithUserDivisionsError,
} from "#/errors";
import { tomorrow, yesterday } from "#/test/test-dates";
import { BaseEntity } from "@mikro-orm/core";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testDemomanDivision, testSoldierDivision, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

const entities: BaseEntity[] = [];
describe("POST /all-out/events/:eventId/registration", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("registers user to event", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);
    await ctx.allOut.stage1Maps.upsert({
      name: "test stage 1 soldier map",
      timeLimit: 10,
      event,
      division: testSoldierDivision,
    });

    const res = await loginAs(
      request(app).post(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert(res.ok);
    const participant = await ctx.allOut.participants.findOne(
      { user: testUser1.id, event },
      { populate: ["divisionCollection"] },
    );
    entities.push(participant!);
    assert.isNotNull(participant);
    assert.deepStrictEqual(
      participant!.divisionCollection.$.map((d) => d.id),
      [testSoldierDivision.id, testDemomanDivision.id],
    );
  });

  it("returns already registered error when user is already registered", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);
    await ctx.allOut.stage1Maps.upsert({
      name: "test stage 1 soldier map",
      timeLimit: 10,
      event,
      division: testSoldierDivision,
    });
    await ctx.allOut.participants.upsert({
      event,
      user: testUser1,
    });

    const res = await loginAs(
      request(app).post(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert.equal(res.status, 409);
    assert.deepStrictEqual(res.body, {
      errorCode: "AlreadyRegisteredError",
      errorMessage: new AlreadyRegisteredError({ userId: testUser1.id, eventId: event.id }).message,
    });
  });

  it("returns event started in past error when trying to register to an event that started in the past", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${yesterday} 10:00`),
      stage1End: new Date(`${yesterday} 11:00`),
      stage2Start: new Date(`${yesterday} 12:00`),
      stage2End: new Date(`${yesterday} 13:00`),
      stage3Start: new Date(`${yesterday} 14:00`),
      stage3End: new Date(`${yesterday} 15:00`),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);

    const res = await loginAs(
      request(app).post(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventStartedInPastError",
      errorMessage: new EventStartedInPastError(event.id, event.stage1Start).message,
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(request(app).post(`/all-out/events/200000/registration`), testUser1);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns unauthorized when not logged in", async () => {
    const res = request(app).post(`/all-out/events/200000/registration`);

    assert.equal((await res).status, 401);
  });

  it("returns no maps with user divisions error when event has no maps with user's divisions", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);
    const division = await ctx.divisions.upsert({
      name: "not users division",
      color: "000000",
    });
    entities.push(division);
    entities.push(
      await ctx.allOut.stage1Maps.upsert({
        name: "some map",
        timeLimit: 10,
        division,
        event,
      }),
      await ctx.allOut.stage2Maps.upsert({
        name: "some map",
        division,
        event,
      }),
      await ctx.allOut.stage3Maps.upsert({
        name: "some map",
        division,
        event,
      }),
    );

    const res = await loginAs(
      request(app).post(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "NoMapsWithUserDivisionsError",
      errorMessage: new NoMapsWithUserDivisionsError(event.id, testUser1.id).message,
    });
  });
});
