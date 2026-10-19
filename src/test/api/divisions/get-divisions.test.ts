import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";

import { testDemomanDivision, testSoldierDivision } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request() {
  return supertest(app).get("/divisions");
}

describe("GET /divisions", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns all divisions", async () => {
    const res = await request();

    assert.equal(res.statusCode, 200);
    assert.containsSubset(res.body, {
      soldier: [
        {
          id: testSoldierDivision.id,
          name: testSoldierDivision.name,
          color: testSoldierDivision.color,
        },
      ],
      demoman: [
        {
          id: testDemomanDivision.id,
          name: testDemomanDivision.name,
          color: testDemomanDivision.color,
        },
      ],
    });
  });
});
