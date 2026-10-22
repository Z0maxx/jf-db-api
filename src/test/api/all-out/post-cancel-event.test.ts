import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventEndedError, EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";

import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).post(`/all-out/events/${eventId}/cancel`);
}

const entities: BaseEntity[] = [];
describe("POST /events/:eventId/cancel", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("cancels event", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
    });
    entities.push(event);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert(res.ok);
    const canceledEvent = await ctx.allOut.events.findOne({ id: event.id });
    assert.isNotNull(canceledEvent);
    assert(canceledEvent!.canceled);
  });

  it("returns event ended error when trying to cancel an event that has ended", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "description",
      stage1Start: new Date(`${yesterday} 10:00`),
      stage1End: new Date(`${yesterday} 11:00`),
      stage2Start: new Date(`${yesterday} 12:00`),
      stage2End: new Date(`${yesterday} 13:00`),
      stage3Start: new Date(`${yesterday} 14:00`),
      stage3End: new Date(`${yesterday} 15:00`),
    });
    entities.push(event);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, getAppError(new EventEndedError(event.id, event.stage3End)));
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(testHeadAdmin, request(200000));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(200000);

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request(200000));

    assert.equal(res.status, 403);
  });
});
