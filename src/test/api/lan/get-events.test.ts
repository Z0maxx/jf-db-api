import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest"
import { app } from "#/app";
import { testLanEvent } from "./lan-test-entities";

describe("GET /lan/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event previews", async () => {
    const res = await request(app).get("/lan/events")

    assert(res.ok)
    assert.containsSubset(res.body, [{
      id: testLanEvent.id,
      start: testLanEvent.start.toISOString(),
      name: testLanEvent.name,
      canceled: testLanEvent.canceled
    }])
  })
});
