import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { BaseEntity } from "@mikro-orm/core";
import { ctx } from "#/db-context";
import { tomorrow, yesterday } from "#/test/test-dates";
import request from "supertest";
import { app } from "#/app";
import { testHeadAdmin, testUser1 } from "../test-entities";
import { EventEndedError, EventNotFoundError } from "#/errors";

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

    const res = await loginAs(request(app).post(`/all-out/events/${event.id}/cancel`), testHeadAdmin);

    assert(res.ok);
    const canceledEvent = await ctx.allOut.events.findOne({ id: event.id });
    assert.notEqual(canceledEvent, null);
    assert(canceledEvent!.canceled);
  });

  it("returns event ended error when trying to cancel an event that has ended", async () => {
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

    const res = await loginAs(request(app).post(`/all-out/events/${event.id}/cancel`), testHeadAdmin);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventEndedError",
      errorMessage: new EventEndedError(event.id, event.stage3End).message,
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(request(app).post("/all-out/events/200000/cancel"), testHeadAdmin);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).post("/all-out/events/200000/cancel");

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(request(app).post("/all-out/events/200000/cancel"), testUser1);

    assert.equal(res.status, 403);
  });
});
