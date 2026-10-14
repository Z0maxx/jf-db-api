import { app } from "#/app";
import { ctx } from "#/db-context";
import { lanCreatedDateValidator } from "#/lan/validators/lan-created-date.validator";
import { lanDuplicateMapValidator } from "#/lan/validators/lan-duplicate-map.validator";
import { lanDuplicateParticipantAliasValidator } from "#/lan/validators/lan-duplicate-participant-alias.validator";
import { lanDuplicateParticipantValidator } from "#/lan/validators/lan-duplicate-participant.validator";
import { tomorrow, yesterday } from "#/test/test-dates";
import { UsersNotFoundError } from "#/users/users.errors";
import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testHeadAdmin, testUser1, testUser2 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testLanDemomanMap, testLanSoldierMap } from "./lan-test-entities";

function request(event?: object) {
  const req = supertest(app).post("/lan/events");
  return event === undefined ? req : req.send(event);
}

const entities: BaseEntity[] = [];
describe("POST /lan/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("creates event", async () => {
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
      posterUrl: "https://poland.tf/wp-content/uploads/2026/09/poland2027.jpg",
      trailerUrl: "https://www.youtube.com/watch?v=mJE42pzZzv0",
      participants: [
        {
          userId: testUser1.id,
          alias: "user 1",
        },
      ],
      maps: {
        soldier: [testLanSoldierMap.name],
        demoman: [testLanDemomanMap.name],
      },
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert(res.ok);
    const createdEvent = await ctx.lan.events.findOne({ id: res.body.id });
    assert.isNotNull(createdEvent);
    entities.push(createdEvent);
    assert.containsSubset(createdEvent.serialize(), {
      name: event.name,
      description: event.description,
      start: event.start,
      end: event.end,
      posterUrl: event.posterUrl,
      trailerUrl: event.trailerUrl,
    });
    const createdParticipants = await ctx.lan.participants.find({ event: createdEvent });
    assert.lengthOf(createdParticipants, 1);
    assert.containsSubset(createdParticipants[0].serialize(), {
      alias: event.participants[0].alias,
      user: event.participants[0].userId,
    });
    const createdMaps = await ctx.lan.maps.find({ event: createdEvent });
    assert.lengthOf(createdMaps, 2);
    assert.containsSubset(
      createdMaps.map((m) => m.serialize()),
      [
        { type: "soldier", name: event.maps.soldier[0] },
        { type: "demoman", name: event.maps.demoman[0] },
      ],
    );
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request({}));

    assert.equal(res.statusCode, 400);
  });

  it("returns validation error when dates are in the past", async () => {
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
      participants: [],
      maps: {
        soldier: [],
        demoman: [],
      },
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanCreatedDateValidator.getMessages(["start", "end"]),
    });
  });

  it("returns validation error when there are duplicate maps", async () => {
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

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanDuplicateMapValidator.getMessages([
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

  it("returns validation error when there are duplicate participants", async () => {
    const event = {
      name: "lan event",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
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

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanDuplicateParticipantValidator.getMessages([testUser1.id]),
    });
  });

  it("returns validation error when there are participants with same alias", async () => {
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

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: lanDuplicateParticipantAliasValidator.getMessages(["same alias"]),
    });
  });

  it("returns not found error when participant user doesn't exist", async () => {
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

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "UsersNotFoundError",
      errorMessages: new UsersNotFoundError([200_000]).messages,
    });
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request();

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request());

    assert.equal(res.status, 403);
  });
});
