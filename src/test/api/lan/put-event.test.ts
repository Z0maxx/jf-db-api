import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { LanMapType } from "#/db-entities/LanMap";
import { EventNotFoundError } from "#/errors";
import { lanUniqueMapValidator } from "#/lan/validators/lan-unique-map.validator";
import { lanUniqueParticipantAliasValidator } from "#/lan/validators/lan-unique-participant-alias.validator";
import { lanUniqueParticipantValidator } from "#/lan/validators/lan-unique-participant.validator";
import { lanUpdatedDateValidator } from "#/lan/validators/lan-updated-date.validator";
import { tomorrow, yesterday } from "#/test/test-dates";
import { UsersNotFoundError } from "#/users/users.errors";

import { testHeadAdmin, testUser1, testUser2 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testLanDemomanMap, testLanSoldierMap } from "./lan-test-entities";

function request(eventId: number, event?: object) {
  const req = supertest(app).put("/lan/events/" + eventId);
  return event === undefined ? req : req.send(event);
}

const entities: BaseEntity[] = [];
describe("PUT /lan/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("updates event", async () => {
    const originalEvent = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      end: new Date(`2030-01-01 16:00`),
      description: "description",
    });
    entities.push(originalEvent);
    await ctx.lan.maps.upsertMany([
      {
        name: "soldier map to delete",
        type: LanMapType.SOLDIER,
        event: originalEvent,
      },
      {
        name: "demoman map to delete",
        type: LanMapType.DEMOMAN,
        event: originalEvent,
      },
    ]);
    await ctx.lan.participants.upsertMany([
      {
        user: testUser1,
        alias: "participant to delete",
        event: originalEvent,
      },
      {
        user: testUser2,
        alias: "alias to update",
        event: originalEvent,
      },
    ]);
    const event = {
      name: "updated lan event",
      description: "updated description",
      start: new Date(`${tomorrow} 17:00`),
      end: new Date(`${tomorrow} 19:00`),
      posterUrl: "https://poland.tf/updated-poster.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=mJE42pzZzv0",
      maps: {
        soldier: ["soldier map to create"],
        demoman: ["demoman map to create"],
      },
      participants: [
        {
          userId: testUser2.id,
          alias: "updated alias",
        },
        {
          userId: testHeadAdmin.id,
          alias: "created participant",
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.status, 200);
    const updatedEvent = await ctx.lan.events.findOne({ id: originalEvent.id });
    assert.isNotNull(updatedEvent);
    assert.containsSubset(updatedEvent!.serialize(), {
      name: event.name,
      description: event.description,
      start: event.start,
      end: event.end,
      posterUrl: event.posterUrl,
      trailerUrl: event.trailerUrl,
    });
    const updatedMaps = await ctx.lan.maps.find({ event: originalEvent });
    assert.lengthOf(updatedMaps, 2);
    assert.containsSubset(
      updatedMaps.map((m) => m.serialize()),
      [
        {
          type: LanMapType.SOLDIER,
          name: event.maps.soldier[0],
        },
        {
          type: LanMapType.DEMOMAN,
          name: event.maps.demoman[0],
        },
      ],
    );
    const updatedParticipants = await ctx.lan.participants.find({ event: originalEvent });
    assert.lengthOf(updatedParticipants, 2);
    assert.containsSubset(
      updatedParticipants.map((p) => p.serialize()),
      [
        {
          user: testUser2.id,
          alias: "updated alias",
        },
        {
          user: testHeadAdmin.id,
          alias: "created participant",
        },
      ],
    );
  });

  it("returns validation error when there are duplicate maps", async () => {
    const originalEvent = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
      description: "description",
    });
    entities.push(originalEvent);
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      participants: [],
      maps: {
        soldier: [testLanSoldierMap.name, testLanSoldierMap.name],
        demoman: [testLanDemomanMap.name, testLanDemomanMap.name],
      },
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanUniqueMapValidator.getMessages([
        {
          type: "soldier",
          duplicates: [testLanSoldierMap.name],
        },
        {
          type: "demoman",
          duplicates: [testLanDemomanMap.name],
        },
      ]),
    });
  });

  it("returns validation error when updated dates are in the past and not the same as current time", async () => {
    const originalEvent = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
      description: "description",
    });
    entities.push(originalEvent);
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${yesterday} 17:00`),
      end: new Date(`${yesterday} 19:00`),
      maps: {
        soldier: [],
        demoman: [],
      },
      participants: [],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanUpdatedDateValidator.getMessages(["start", "end"]),
    });
  });

  it("returns validation error when there are duplicate participants", async () => {
    const originalEvent = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      description: "description",
    });
    entities.push(originalEvent);
    const event = {
      name: "lan event",
      description: "description",
      start: originalEvent.start,
      participants: [
        {
          userId: testUser1.id,
        },
        {
          userId: testUser1.id,
        },
      ],
      maps: {
        soldier: [],
        demoman: [],
      },
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanUniqueParticipantValidator.getMessages([testUser1.id]),
    });
  });

  it("returns validation error when there are participants with same alias", async () => {
    const originalEvent = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      description: "description",
    });
    entities.push(originalEvent);
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      participants: [
        {
          userId: testUser1.id,
          alias: "same alias",
        },
        {
          userId: testUser2.id,
          alias: "same alias",
        },
      ],
      maps: {
        soldier: [],
        demoman: [],
      },
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanUniqueParticipantAliasValidator.getMessages(["same alias"]),
    });
  });

  it("returns not found error when participant user doesn't exist", async () => {
    const originalEvent = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      description: "description",
    });
    entities.push(originalEvent);
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      participants: [
        {
          userId: 200_000,
        },
      ],
      maps: {
        soldier: [],
        demoman: [],
      },
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "UsersNotFoundError",
      errorMessages: new UsersNotFoundError([200_000]).messages,
    });
  });

  it("returns not found error when event doesn't exist", async () => {
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      participants: [
        {
          userId: 200_000,
        },
      ],
      maps: {
        soldier: [],
        demoman: [],
      },
    };

    const res = await loginAs(testHeadAdmin, request(200000, event));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request(200000, {}));

    assert.equal(res.statusCode, 400);
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
