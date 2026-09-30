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
    assert.containsSubset(res.body, {
      soldier: [
        {
          name: testSoldierDivision.name,
          color: testSoldierDivision.color,
        },
      ],
      demoman: [
        {
          name: testDemomanDivision.name,
          color: testDemomanDivision.color,
        },
      ],
    });
  });
});
