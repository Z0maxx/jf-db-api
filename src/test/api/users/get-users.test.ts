import { app } from "#/app";
import { steamService } from "#/steam/steam.service";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testUser1 } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

describe("GET /users", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns the user with matching steam id when query is steam id", async () => {
    const res1 = await request(app).get("/users?query=76561198167723343");
    const res2 = await request(app).get("/users?query=STEAM_0:1:103728807");
    const res3 = await request(app).get("/users?query=[U:1:207457615]");

    assert(res1.ok);
    assert(res2.ok);
    assert(res3.ok);
    assert.equal(res1.body.length, 1);
    assert.equal(res2.body.length, 1);
    assert.equal(res3.body.length, 1);
    assert.equal(res1.body[0].id, testUser1.id);
    assert.equal(res2.body[0].id, testUser1.id);
    assert.equal(res3.body[0].id, testUser1.id);
  });

  it("returns users with matching name when query is not steam id", async () => {
    const steamUser = await steamService.getUserAsync(testUser1.steam64Id);

    const res = await request(app).get("/users?query=" + steamUser.name);

    assert(res.ok);
    const returnedUser = (res.body as any[]).find((u) => u.id === testUser1.id);
    assert.isNotNull(returnedUser);
  });

  it("returns empty list when query is steam id with no matching user", async () => {
    const res = await request(app).get("/users?query=76561199194518768");

    assert(res.ok);
    assert.isEmpty(res.body);
  });
});
