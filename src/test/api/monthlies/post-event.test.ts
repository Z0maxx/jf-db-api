import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { DivisionsNotFoundError } from "#/divisions/divisions.errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { monthlyCreatedDateValidator } from "#/monthlies/validators/monthly-created-date.validator";
import { monthlyDivisionSingleMapValidator } from "#/monthlies/validators/monthly-division-single-map.validator";
import { monthlyDivisionTypeValidator } from "#/monthlies/validators/monthly-division-type.validator";
import { monthlyScheduleValidator } from "#/monthlies/validators/monthly-schedule.validator";
import { tomorrow, yesterday } from "#/test/test-dates";

import {
  testDemomanDivision,
  testHeadAdmin,
  testSoldierDivision,
  testUser1,
} from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(event?: object) {
  const req = supertest(app).post("/monthlies/events");
  return event === undefined ? req : req.send(event);
}

const entities: BaseEntity[] = [];
describe("POST /monthlies/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("creates event with maps", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
      maps: [
        {
          name: "soldier map",
          divisionId: testSoldierDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.status, 201);
    const createdEvent = await ctx.monthlies.events.findOne({ id: res.body.id });
    assert.isNotNull(createdEvent);
    entities.push(createdEvent!);
    assert.containsSubset(createdEvent!.serialize(), {
      type: event.type,
      description: event.description,
      start: event.start,
      end: event.end,
      canceled: false,
    });
    const createdMaps = await ctx.monthlies.maps.find({ event: createdEvent });
    assert.lengthOf(createdMaps, 1);
    assert.containsSubset(
      createdMaps.map((map) => map.serialize()),
      [{ name: event.maps[0].name, division: testSoldierDivision.id }],
    );
  });

  it("returns validation error when event times are out of order", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 16:00`),
      end: new Date(`${tomorrow} 10:00`),
      maps: [
        {
          name: "soldier map",
          divisionId: testSoldierDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyScheduleValidator.getMessages([
        { earlier: "start time", later: "end time" },
      ]),
    });
  });

  it("returns validation error when event dates are in the past", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
      maps: [
        {
          name: "soldier map",
          divisionId: testSoldierDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyCreatedDateValidator.getMessages(["start", "end"]),
    });
  });

  it("returns validation error when there are multiple maps for a division", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
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

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyDivisionSingleMapValidator.getMessages([testSoldierDivision.id]),
    });
  });

  it("returns validation error when a map division's type does not match event's type", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
      maps: [
        {
          name: "demoman map",
          divisionId: testDemomanDivision.id,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: monthlyDivisionTypeValidator.getMessages([testDemomanDivision.id]),
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request({}));

    assert.equal(res.status, 400);
  });

  it("returns divisions not found error when divisions don't exist", async () => {
    const event = {
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
      maps: [
        {
          name: "soldier map",
          divisionId: 200_000,
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new DivisionsNotFoundError([200_000])));
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request({}));

    assert.equal(res.status, 400);
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
