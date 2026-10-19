import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { LanMapType } from "#/db-entities/LanMap";
import { EventNotFoundError } from "#/errors";

import { testHeadAdmin, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number) {
  return supertest(app).delete(`/lan/events/${eventId}`);
}

const entities: BaseEntity[] = [];
describe("DELETE /lan/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("deletes event, its maps and participants", async () => {
    const event = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      description: "description",
    });
    entities.push(event);
    await ctx.lan.maps.upsertMany([
      {
        name: "soldier map to delete",
        type: LanMapType.SOLDIER,
        event,
      },
    ]);
    await ctx.lan.participants.upsertMany([
      {
        user: testUser1,
        alias: "",
        event,
      },
    ]);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert(res.ok);
    const deletedEvent = await ctx.lan.events.findOne({ id: event.id });
    assert.notExists(deletedEvent?.id);
    const deletedMaps = await ctx.lan.maps.find({ event });
    assert.isEmpty(deletedMaps);
    const deletedParticipants = await ctx.lan.maps.find({ event });
    assert.isEmpty(deletedParticipants);
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(testHeadAdmin, request(200_000));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(200000);

    assert.equal(res.statusCode, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request(200000));

    assert.equal(res.statusCode, 403);
  });
});
