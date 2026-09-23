import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { app } from "#/app";
import { claimNames } from "#/claim-names";

describe("GET /roles", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns all roles", async () => {
    const res = await request(app).get("/roles");

    assert(res.ok);
    assert.containsSubset(res.body, [
      {
        name: "head admin",
        claims: claimNames.map((name) => ({ name })),
      },
      {
        name: "user",
        claims: [],
      },
    ]);
  });
});
