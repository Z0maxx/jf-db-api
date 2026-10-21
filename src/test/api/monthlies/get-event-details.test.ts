import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";

import { testSoldierDivision } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testMonthlyEvent, testMonthlyMap } from "./monthly-test-entities";

function request(eventId: number) {
  return supertest(app).get(`/monthlies/events/${eventId}`);
}

describe("GET /monthlies/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event details", async () => {
    const res = await request(testMonthlyEvent.id);

    assert(res.ok);
    assert.deepStrictEqual(res.body, {
      id: testMonthlyEvent.id,
      type: testMonthlyEvent.type,
      canceled: testMonthlyEvent.canceled,
      description: testMonthlyEvent.description,
      start: testMonthlyEvent.start.toISOString(),
      end: testMonthlyEvent.end.toISOString(),
      maps: [
        {
          id: testMonthlyMap.id,
          name: testMonthlyMap.name,
          division: {
            name: testSoldierDivision.name,
            color: testSoldierDivision.color,
          },
        },
      ],
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await request(200_000);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });
});
