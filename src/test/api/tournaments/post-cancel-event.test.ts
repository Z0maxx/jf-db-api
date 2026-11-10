import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventEndedError, EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { yesterday } from "#/test/test-dates";

import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).post(`/tournaments/events/${eventId}/cancel`);
}

const entities: BaseEntity[] = [];

describe("POST /tournaments/events/:eventId/cancel", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("cancels event", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "event to cancel",
      start: new Date("2030-01-01 10:00"),
    });
    entities.push(event);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert.equal(res.statusCode, 204);
    assert.isTrue(event.canceled);
  });

  it("returns event ended error when trying to cancel an event that has ended", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "event to cancel",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
    });
    entities.push(event);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, getAppError(new EventEndedError(event.id, event.end!)));
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(testHeadAdmin, request(200_000));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(200_000);

    assert.equal(res.statusCode, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request(200_000));

    assert.equal(res.statusCode, 403);
  });
});
