import { app } from "#/app";
import { EventNotFoundError } from "#/errors";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testDemomanDivision, testSoldierDivision, testUser1, testUser2 } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import {
  testAllOutEvent,
  testAllOutParticipant1,
  testAllOutParticipant2,
} from "./all-out-test-entities";

describe("GET /all-out/event/:eventId/participants", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event participants", async () => {
    const res = await request(app).get(`/all-out/events/${testAllOutEvent.id}/participants`);

    assert(res.ok);
    assert.equal(res.body.length, 2);
    assert.hasAnyKeys(res.body[0], ["name", "avatar"]);
    assert.containsSubset(res.body, [
      {
        id: testAllOutParticipant1.id,
        steam64Id: testUser1.steam64Id,
        divisions: [
          {
            type: testSoldierDivision.type,
            color: testSoldierDivision.color,
            name: testSoldierDivision.name,
          },
          {
            type: testDemomanDivision.type,
            color: testDemomanDivision.color,
            name: testDemomanDivision.name,
          },
        ],
      },
      {
        id: testAllOutParticipant2.id,
        steam64Id: testUser2.steam64Id,
        divisions: [
          {
            type: testSoldierDivision.type,
            color: testSoldierDivision.color,
            name: testSoldierDivision.name,
          },
          {
            type: testDemomanDivision.type,
            color: testDemomanDivision.color,
            name: testDemomanDivision.name,
          },
        ],
      },
    ]);
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await request(app).get(`/all-out/events/200000/participants`);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });
});
