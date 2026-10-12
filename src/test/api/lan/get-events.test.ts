import { app } from "#/app";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testLanEvent } from "./lan-test-entities";
function request() {
  return supertest(app).get("/lan/events");
}

describe("GET /lan/events", () => {
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
        id: testLanEvent.id,
        start: testLanEvent.start.toISOString(),
        name: testLanEvent.name,
        canceled: testLanEvent.canceled,
      },
    ]);
  });
});
