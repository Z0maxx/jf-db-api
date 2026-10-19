import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";

import { testDemomanDivision, testSoldierDivision, testUser1 } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import {
  testLanDemomanMap,
  testLanEvent,
  testLanParticipant,
  testLanSoldierMap,
} from "./lan-test-entities";

function request(eventId = testLanEvent.id) {
  return supertest(app).get("/lan/events/" + eventId);
}

describe("GET /lan/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event details", async () => {
    const res = await request();

    assert(res.ok);
    assert.containsSubset(res.body, {
      id: testLanEvent.id,
      start: testLanEvent.start.toISOString(),
      end: testLanEvent.end?.toISOString(),
      name: testLanEvent.name,
      description: testLanEvent.description,
      posterUrl: testLanEvent.posterUrl,
      trailerUrl: testLanEvent.trailerUrl,
      canceled: testLanEvent.canceled,
      maps: {
        soldier: [testLanSoldierMap.name],
        demoman: [testLanDemomanMap.name],
      },
      participants: [
        {
          id: testLanParticipant.id,
          alias: testLanParticipant.alias,
          disqualified: testLanParticipant.disqualified,
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
});
