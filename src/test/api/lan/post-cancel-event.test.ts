import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventNotFoundError } from "#/errors";
import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).post(`/lan/events/${eventId}/cancel`);
}

const entities: BaseEntity[] = [];
describe("POST /lan/events/:eventId/cancel", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("cancels event", async () => {
    const event = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      description: "description",
    });
    entities.push(event);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert(res.ok);
    assert(event.canceled);
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(testHeadAdmin, request(200_000));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
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
