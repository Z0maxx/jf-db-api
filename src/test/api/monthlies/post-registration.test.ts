import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import {
  AlreadyRegisteredError,
  EventEndedError,
  EventNotFoundError,
  NoMapsWithUserDivisionsError,
} from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";

import { testSoldierDivision, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).post(`/monthlies/events/${eventId}/registration`);
}

const entities: BaseEntity[] = [];
describe("POST /monthlies/events/:eventId/registration", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("registers user to event", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 204);
    const participant = await ctx.monthlies.participants.findOne(
      { user: testUser1.id, event },
      { populate: ["division"] },
    );
    assert.isNotNull(participant);
    entities.push(participant!);
    assert.equal(participant!.division.id, testSoldierDivision.id);
  });

  it("returns already registered error when user is already registered", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 409);
    const loadedTestUser = await ctx.users.findOneOrFail(
      { id: testUser1.id },
      { populate: ["role.claimCollection", "divisionCollection"] },
    );
    assert.deepStrictEqual(
      res.body,
      getAppError(
        new AlreadyRegisteredError({
          eventId: event.id,
          user: loadedTestUser,
        }),
      ),
    );
  });

  it("returns event ended error when trying to register to an event that has ended", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
    });
    entities.push(event);

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, getAppError(new EventEndedError(event.id, event.end)));
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(testUser1, request(200_000));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(200_200);

    assert.equal(res.status, 401);
  });

  it("returns no maps with user divisions error when event has no maps with user's divisions", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const division = await ctx.divisions.upsert({
      name: "not users division",
      color: "000000",
    });
    entities.push(division);
    await ctx.monthlies.maps.upsert({
      name: "some map",
      division,
      event,
    });

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(
      res.body,
      getAppError(new NoMapsWithUserDivisionsError(event.id, testUser1.id)),
    );
  });
});
