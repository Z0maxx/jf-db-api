import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";

import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testMonthlyEvent } from "./monthly-test-entities";

function request() {
  return supertest(app).get("/monthlies/events");
}

describe("GET /monthlies/events", () => {
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
        id: testMonthlyEvent.id,
        type: testMonthlyEvent.type,
        description: testMonthlyEvent.description,
        start: testMonthlyEvent.start.toISOString(),
        end: testMonthlyEvent.end.toISOString(),
        canceled: testMonthlyEvent.canceled,
      },
    ]);
  });
});
