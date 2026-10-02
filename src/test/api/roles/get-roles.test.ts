import { app } from "#/app";
import { headAdminRole, userRole } from "#/default-entities";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

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
        id: headAdminRole.id,
        name: headAdminRole.name,
        claims: headAdminRole.claimCollection.$.map(({ id, name }) => ({ id, name })),
      },
      {
        id: userRole.id,
        name: userRole.name,
        claims: userRole.claimCollection.$.map((c) => c.name),
      },
    ]);
  });
});
