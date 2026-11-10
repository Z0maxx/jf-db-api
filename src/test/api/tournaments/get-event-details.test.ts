import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";

import { testDemomanDivision, testSoldierDivision, testUser1 } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import {
  testTournamentEvent,
  testTournamentMap,
  testTournamentParticipant,
} from "./tournament-test-entities";

function request(eventId: number) {
  return supertest(app).get(`/tournaments/events/${eventId}`);
}

describe("GET /tournaments/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event details", async () => {
    const res = await request(testTournamentEvent.id);

    assert(res.ok);
    assert.containsSubset(res.body, {
      id: testTournamentEvent.id,
      type: testTournamentEvent.type,
      description: testTournamentEvent.description,
      start: testTournamentEvent.start.toISOString(),
      canceled: testTournamentEvent.canceled,
      maps: [testTournamentMap.name],
      participants: [
        {
          id: testTournamentParticipant.id,
          alias: testTournamentParticipant.alias,
          resigned: false,
          steam64Id: testUser1.steam64Id,
          soldierDivision: {
            name: testSoldierDivision.name,
            color: testSoldierDivision.color,
          },
          demomanDivision: {
            name: testDemomanDivision.name,
            color: testDemomanDivision.color,
          },
        },
      ],
    });
    assert.hasAnyKeys(res.body.participants[0], ["name", "avatar"]);
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await request(200_000);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });
});
