import { app } from "#/app";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testDemomanDivision, testSoldierDivision } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

describe("GET /divisions", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns all divisions", async () => {
    const res = await request(app).get("/divisions");

    assert.equal(res.statusCode, 200);
    assert.containsSubset(res.body, [
      {
        type: testSoldierDivision.type,
        name: testSoldierDivision.name,
        color: testSoldierDivision.color,
      },
      {
        type: testDemomanDivision.type,
        name: testDemomanDivision.name,
        color: testDemomanDivision.color,
      },
    ]);
  });
});
