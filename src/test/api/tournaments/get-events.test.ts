import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";

import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testTournamentEvent } from "./tournament-test-entities";

function request() {
  return supertest(app).get("/tournaments/events");
}

describe("GET /tournaments/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event previews", async () => {
    const res = await request();

    assert(res.ok);
    assert.containsSubset(res.body, [
      {
        id: testTournamentEvent.id,
        type: testTournamentEvent.type,
        description: testTournamentEvent.description,
        start: testTournamentEvent.start.toISOString(),
        end: testTournamentEvent.end?.toISOString(),
        canceled: testTournamentEvent.canceled,
      },
    ]);
  });
});
