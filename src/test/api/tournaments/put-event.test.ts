import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";
import { tournamentParticipantCountValidator } from "#/tournaments/validators/tournament-participant-count.validator";
import { tournamentUniqueMapValidator } from "#/tournaments/validators/tournament-unique-map.validator";
import { tournamentUniqueParticipantAliasValidator } from "#/tournaments/validators/tournament-unique-participant-alias.validator";
import { tournamentUniqueParticipantValidator } from "#/tournaments/validators/tournament-unique-participant.validator";
import { tournamentUpdatedDateValidator } from "#/tournaments/validators/tournament-updated-date.validator";

import { testHeadAdmin, testUser1, testUser2 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testTournamentEvent } from "./tournament-test-entities";

function request(eventId: number, event?: object) {
  const req = supertest(app).put(`/tournaments/events/${eventId}`);
  return event === undefined ? req : req.send(event);
}

const entities: BaseEntity[] = [];

describe("PUT /tournaments/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("updates event, its maps and participants", async () => {
    const originalEvent = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date("2030-01-01 10:00"),
    });
    entities.push(originalEvent);
    await ctx.tournaments.maps.upsert({
      name: "map to delete",
      event: originalEvent,
    });
    await ctx.tournaments.participants.upsertMany([
      {
        user: testUser1,
        event: originalEvent,
        alias: "participant to delete",
      },
      {
        user: testUser1,
        event: originalEvent,
        alias: "alias to update",
      },
    ]);

    const event = {
      type: "demoman",
      description: "updated description",
      start: new Date(`${tomorrow} 10:00`),
      maps: ["map to create"],
      participants: [
        {
          userId: testUser2.id,
          alias: "updated alias",
        },
        {
          userId: testHeadAdmin.id,
          alias: "participant to create",
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 200);
    const updatedEvent = await ctx.tournaments.events.findOne({ id: originalEvent.id });
    assert.isNotNull(updatedEvent);
    entities.push(updatedEvent!);
    assert.containsSubset(updatedEvent!.serialize(), {
      type: event.type,
      description: event.description,
      start: event.start,
    });
    const updatedMaps = await ctx.tournaments.maps.find({ event: originalEvent.id });
    assert.lengthOf(updatedMaps, 1);
    assert.equal(updatedMaps[0].name, event.maps[0]);
    const updatedParticipants = await ctx.tournaments.participants.find({
      event: originalEvent.id,
    });
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
          alias: "participant to create",
        },
      ],
    );
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request(testTournamentEvent.id, {}));

    assert.equal(res.statusCode, 400);
  });

  it("returns validation error when start time is in the past", async () => {
    const originalEvent = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date("2030-01-01 10:00"),
    });
    entities.push(originalEvent);
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      maps: [],
      participants: [],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUpdatedDateValidator.getMessages(["start"]),
    });
  });

  it("returns validation error when there are duplicate maps", async () => {
    const originalEvent = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date("2030-01-01 10:00"),
    });
    entities.push(originalEvent);
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: ["duplicate map", "duplicate map"],
      participants: [],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUniqueMapValidator.getMessages(["duplicate map"]),
    });
  });

  it("returns validation error when there are duplicate participants", async () => {
    const originalEvent = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date("2030-01-01 10:00"),
    });
    entities.push(originalEvent);
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: [],
      participants: [{ userId: testUser1.id }, { userId: testUser1.id }],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUniqueParticipantValidator.getMessages([testUser1.id]),
    });
  });

  it("returns validation error when participants have duplicate aliases", async () => {
    const originalEvent = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date("2030-01-01 10:00"),
    });
    entities.push(originalEvent);
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

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentUniqueParticipantAliasValidator.getMessages(["duplicate alias"]),
    });
  });

  it("returns validation error when participant count is not a power of 2", async () => {
    const originalEvent = await ctx.tournaments.events.upsert({
      type: "soldier",
      description: "description",
      start: new Date("2030-01-01 10:00"),
    });
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

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.statusCode, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentParticipantCountValidator.getMessages(),
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const event = {
      type: "soldier",
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      maps: [],
      participants: [],
    };

    const res = await loginAs(testHeadAdmin, request(200_000, event));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(testTournamentEvent.id);

    assert.equal(res.statusCode, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request(testTournamentEvent.id));

    assert.equal(res.statusCode, 403);
  });
});
