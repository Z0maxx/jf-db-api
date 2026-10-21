import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { EventEndedError, EventNotFoundError, RegistrationNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";

import { testSoldierDivision, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).post(`/monthlies/events/${eventId}/resign`);
}

const entities: BaseEntity[] = [];
describe("POST /monthlies/events/:eventId/resign", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("deletes participant when event has not started", async () => {
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

    assert.equal(res.status, 204);
    const deletedParticipant = await ctx.monthlies.participants.findOne({
      user: testUser1,
      event,
    });
    assert.notExists(deletedParticipant?.id);
  });

  it("resigns participant when event has started", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const participant = await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 204);
    assert.isTrue(participant.resigned);
  });

  it("returns event ended error when trying to resign from an event that has ended", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
    });
    entities.push(event);
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventEndedError",
      errorMessage: new EventEndedError(event.id, event.end).message,
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(testUser1, request(200_000));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns registration not found error when registration doesn't exist", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);

    const res = await loginAs(testUser1, request(event.id));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(
      res.body,
      getAppError(
        new RegistrationNotFoundError({
          user: testUser1,
          eventId: event.id,
        }),
      ),
    );
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(200_000);

    assert.equal(res.status, 401);
  });
});
