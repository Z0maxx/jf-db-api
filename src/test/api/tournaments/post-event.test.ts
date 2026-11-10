import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";
import { tournamentCreatedDateValidator } from "#/tournaments/validators/tournament-created-date.validator";
import { tournamentParticipantCountValidator } from "#/tournaments/validators/tournament-participant-count.validator";
import { tournamentUniqueMapValidator } from "#/tournaments/validators/tournament-unique-map.validator";
import { tournamentUniqueParticipantAliasValidator } from "#/tournaments/validators/tournament-unique-participant-alias.validator";
import { tournamentUniqueParticipantValidator } from "#/tournaments/validators/tournament-unique-participant.validator";
import { UsersNotFoundError } from "#/users/users.errors";

import { testHeadAdmin, testUser1, testUser2 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(event?: object) {
  const req = supertest(app).post("/tournaments/events");
  return event === undefined ? req : req.send(event);
}

const entities: BaseEntity[] = [];

describe("POST /tournaments/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("creates event with maps and participants", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: ["map to create"],
      participants: [{ userId: testUser1.id, alias: "user 1" }],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 201);
    const createdEvent = await ctx.tournaments.events.findOne({ id: res.body.id });
    assert.isNotNull(createdEvent);
    entities.push(createdEvent!);
    assert.containsSubset(createdEvent!.serialize(), {
      type: event.type,
      description: event.description,
      start: event.start,
      canceled: false,
    });
    const createdMaps = await ctx.tournaments.maps.find({ event: createdEvent });
    assert.lengthOf(createdMaps, 1);
    assert.equal(createdMaps[0].name, event.maps[0]);
    const createdParticipants = await ctx.tournaments.participants.find({
      event: createdEvent,
    });
    assert.lengthOf(createdParticipants, 1);
    assert.containsSubset(createdParticipants[0].serialize(), {
      user: testUser1.id,
      alias: event.participants[0].alias,
    });
  });

  it("returns validation error when start time is in the past", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      maps: [],
      participants: [],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentCreatedDateValidator.getMessages(["start"]),
    });
  });

  it("returns validation error when there are duplicate maps", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: ["duplicate map", "duplicate map"],
      participants: [],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUniqueMapValidator.getMessages(["duplicate map"]),
    });
  });

  it("returns validation error when there are duplicate participants", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: [],
      participants: [{ userId: testUser1.id }, { userId: testUser1.id }],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUniqueParticipantValidator.getMessages([testUser1.id]),
    });
  });

  it("returns validation error when participants have duplicate aliases", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: [],
      participants: [
        { userId: testUser1.id, alias: "duplicate alias" },
        { userId: testUser2.id, alias: "duplicate alias" },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUniqueParticipantAliasValidator.getMessages(["duplicate alias"]),
    });
  });

  it("returns validation error when participant count is not a power of 2", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: [],
      participants: [
        { userId: testUser1.id },
        { userId: testUser2.id },
        { userId: testHeadAdmin.id },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentParticipantCountValidator.getMessages(),
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request({}));

    assert.equal(res.statusCode, 400);
  });

  it("returns not found error when participant user doesn't exist", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: [],
      participants: [{ userId: 200_000 }],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new UsersNotFoundError([200_000])));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request();

    assert.equal(res.statusCode, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request());

    assert.equal(res.statusCode, 403);
  });
});
