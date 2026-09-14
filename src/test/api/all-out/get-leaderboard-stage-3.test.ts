import { app } from "#/app";
import { MapNotFoundError } from "#/errors";
import request from "supertest";
import {
  testAllOutStage3LeaderboardItem2,
  testAllOutStage3SoldierMap,
} from "./all-out-test-entities";
import { testUser2 } from "../test-entities";
import { beforeAll, afterAll, assert, it, describe } from "vitest";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

describe("GET /all-out/leaderboard/stage-3", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns paged stage 3 leaderboard", async () => {
    const queryParams = new URLSearchParams({
      mapId: testAllOutStage3SoldierMap.id.toString(),
      page: "2",
      pageSize: "1",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-3?" + queryParams);

    assert(res.ok);
    assert.notEqual(res.body, null);
    assert.hasAnyKeys(res.body[0].user, ["name", "avatar"]);
    assert.containSubset(res.body, [
      {
        id: testAllOutStage3LeaderboardItem2.id,
        user: {
          steamId64: testUser2.steamId64,
        },
        pr: {
          seconds: testAllOutStage3LeaderboardItem2.prSeconds,
          timestamp: testAllOutStage3LeaderboardItem2.prTimestamp.toISOString(),
        },
      },
    ]);
  });

  it("returns no items when page param is too big", async () => {
    const queryParams = new URLSearchParams({
      mapId: testAllOutStage3SoldierMap.id.toString(),
      page: "10",
      pageSize: "2",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-3?" + queryParams);

    assert(res.ok);
    assert.notEqual(res.body, null);
    assert.deepEqual(res.body, []);
  });

  it("returns not found error when map doesn't exist", async () => {
    const queryParams = new URLSearchParams({
      mapId: "200000",
      page: "2",
      pageSize: "2",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-3?" + queryParams);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      errorCode: "MapNotFoundError",
      errorMessage: new MapNotFoundError(200_000).message,
    });
  });

  it("returns bad request when params are incorrect", async () => {
    const queryParams = new URLSearchParams({
      page: "-10",
      pageSize: "asd",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-1?" + queryParams);

    assert(res.badRequest);
    assert(["mapId", "page", "pageSize"].every((param) => res.text.includes(param)));
  });
});
