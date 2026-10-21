import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";

import { testSoldierDivision, testUser1, testUser2 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testMonthlyEvent } from "./monthly-test-entities";

function request(eventId: number) {
  return supertest(app).get(`/monthlies/events/${eventId}/registration`);
}

const entities: BaseEntity[] = [];
describe("GET /monthlies/events/:eventId/registration", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("returns registration details", async () => {
    const otherEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(otherEvent);
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      event: otherEvent,
      resigned: true,
      division: testSoldierDivision,
    });

    const registered = await loginAs(testUser1, request(testMonthlyEvent.id));
    const resigned = await loginAs(testUser1, request(otherEvent.id));
    const notRegistered = await loginAs(testUser2, request(otherEvent.id));

    assert(registered.ok);
    assert(resigned.ok);
    assert(notRegistered.ok);
    assert.deepStrictEqual(registered.body, { registered: true, resigned: false });
    assert.deepStrictEqual(resigned.body, { registered: true, resigned: true });
    assert.deepStrictEqual(notRegistered.body, { registered: false, resigned: false });
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(testUser1, request(200_000));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(testMonthlyEvent.id);

    assert.equal(res.statusCode, 401);
  });
});
