import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";

import { testSoldierDivision, testUser1, testUser2 } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import {
  createMonthlyTestEntitiesAsync,
  testMonthlyEvent,
  testMonthlyParticipant1,
  testMonthlyParticipant2,
} from "./monthly-test-entities";

function request(eventId: number) {
  return supertest(app).get(`/monthlies/events/${eventId}/participants`);
}

describe("GET /monthlies/events/:eventId/participants", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
    await createMonthlyTestEntitiesAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event participants", async () => {
    const res = await request(testMonthlyEvent.id);

    assert(res.ok);
    assert.lengthOf(res.body, 2);
    assert.hasAnyKeys(res.body[0], ["name", "avatar"]);
    assert.containsSubset(res.body, [
      {
        id: testMonthlyParticipant1.id,
        steam64Id: testUser1.steam64Id,
        resigned: false,
        division: {
          name: testSoldierDivision.name,
          color: testSoldierDivision.color,
        },
      },
      {
        id: testMonthlyParticipant2.id,
        steam64Id: testUser2.steam64Id,
        resigned: false,
        division: {
          name: testSoldierDivision.name,
          color: testSoldierDivision.color,
        },
      },
    ]);
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await request(200_000);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });
});
