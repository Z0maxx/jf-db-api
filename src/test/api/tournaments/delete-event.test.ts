import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";

import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).delete(`/tournaments/events/${eventId}`);
}

const entities: BaseEntity[] = [];

describe("DELETE /tournaments/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("deletes event, its maps and participants", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "event to delete",
      start: new Date("2030-01-01 10:00"),
    });
    await ctx.tournaments.maps.upsert({
      name: "map to delete",
      event,
    });
    await ctx.tournaments.participants.upsert({
      user: testUser1,
      event,
    });

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert.equal(res.statusCode, 204);
    const deletedEvent = await ctx.tournaments.events.findOne({ id: event.id });
    assert.notExists(deletedEvent?.id);
    const deletedEventMaps = await ctx.tournaments.maps.find({ event });
    assert.isEmpty(deletedEventMaps);
    const deletedEventParticipants = await ctx.tournaments.participants.find({ event });
    assert.isEmpty(deletedEventParticipants);
  });

  it("returns event not found error when event doesn't exist", async () => {
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
