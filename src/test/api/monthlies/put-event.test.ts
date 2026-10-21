import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { DivisionsNotFoundError } from "#/divisions/divisions.errors";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { monthlyDivisionSingleMapValidator } from "#/monthlies/validators/monthly-division-single-map.validator";
import { monthlyDivisionTypeValidator } from "#/monthlies/validators/monthly-division-type.validator";
import { monthlyScheduleValidator } from "#/monthlies/validators/monthly-schedule.validator";
import { monthlyUpdatedDateValidator } from "#/monthlies/validators/monthly-updated-date.validator";
import { tomorrow, yesterday } from "#/test/test-dates";

import {
  testDemomanDivision,
  testHeadAdmin,
  testSoldierDivision,
  testUser1,
} from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(eventId: number, event?: object) {
  const req = supertest(app).put(`/monthlies/events/${eventId}`);
  return event === undefined ? req : req.send(event);
}

const entities: BaseEntity[] = [];
describe("PUT /monthlies/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("updates event and its maps", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(originalEvent);
    await ctx.monthlies.maps.upsert({
      name: "map to delete",
      division: testSoldierDivision,
      event: originalEvent,
    });
    const event = {
      type: MonthlyEventType.DEMOMAN,
      description: "updated description",
      start: new Date(`${tomorrow} 11:00`),
      end: new Date(`${tomorrow} 17:00`),
      maps: [
        {
          name: "map to create",
          divisionId: testDemomanDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert(res.ok);
    const updatedEvent = await ctx.monthlies.events.findOne({ id: originalEvent.id });
    assert.isNotNull(updatedEvent);
    assert.containsSubset(updatedEvent!.serialize(), {
      type: event.type,
      description: event.description,
      start: event.start,
      end: event.end,
    });
    const updatedMaps = await ctx.monthlies.maps.find({ event: originalEvent });
    assert.lengthOf(updatedMaps, 1);
    assert.containsSubset(updatedMaps[0].serialize(), {
      name: event.maps[0].name,
      division: testDemomanDivision.id,
    });
  });

  it("deletes participant when there is no longer a map with user's division", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(originalEvent);
    await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event: originalEvent,
    });
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      event: originalEvent,
      division: testSoldierDivision,
    });
    const otherDivision = await ctx.divisions.upsert({
      name: "division for monthly event",
      color: "000000",
    });
    entities.push(otherDivision);
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
      maps: [
        {
          name: "other soldier map",
          divisionId: otherDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert(res.ok);
    const deletedParticipant = await ctx.monthlies.participants.findOne({
      user: testUser1,
      event: originalEvent,
    });
    assert.notExists(deletedParticipant?.id);
  });

  it("returns validation error when event times are out of order", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(originalEvent);
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 16:00`),
      end: new Date(`${tomorrow} 10:00`),
      maps: [],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyScheduleValidator.getMessages([
        { earlier: "start time", later: "end time" },
      ]),
    });
  });

  it("returns validation error when updated event times are in the past and not the same as current time", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
    });
    entities.push(originalEvent);
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 11:00`),
      end: new Date(`${yesterday} 16:00`),
      maps: [],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyUpdatedDateValidator.getMessages(["start"]),
    });
  });

  it("returns validation error when there are multiple maps for a division", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(originalEvent);
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
      maps: [
        {
          name: "soldier map 1",
          divisionId: testSoldierDivision.id,
        },
        {
          name: "soldier map 2",
          divisionId: testSoldierDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyDivisionSingleMapValidator.getMessages([testSoldierDivision.id]),
    });
  });

  it("returns validation error when a map division's type does not match event's type", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(originalEvent);
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
      maps: [
        {
          name: "demoman map",
          divisionId: testDemomanDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyDivisionTypeValidator.getMessages([testDemomanDivision.id]),
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request(200_000, {}));

    assert.equal(res.status, 400);
  });

  it("returns divisions not found error when division doesn't exist", async () => {
    const originalEvent = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(originalEvent);
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
      maps: [
        {
          name: "soldier map",
          divisionId: 200_000,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(originalEvent.id, event));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new DivisionsNotFoundError([200_000])));
  });

  it("returns event not found error when event doesn't exist", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
      maps: [],
    };

    const res = await loginAs(testHeadAdmin, request(200_000, event));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(200_104);

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request(200_104));

    assert.equal(res.status, 403);
  });
});
