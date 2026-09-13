import { app } from "@/app";
import { MapNotFoundError } from "@/errors";
import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import {
  testAllOutStage2LeaderboardItem1,
  testAllOutStage2SoldierMap,
} from "./test-all-out-entities";
import { initAllOutTestsAsync } from "./all-out-util";
import { ctx } from "@/db-context";
import { testUser1 } from "../test-entities";

describe("GET /all-out/leaderboard/stage-2", () => {
  before(async () => {
    await initAllOutTestsAsync();
  });

  after(async () => {
    await ctx.orm.close(true);
  });

  it("returns paged stage 2 leaderboard", async () => {
    const queryParams = new URLSearchParams({
      mapId: testAllOutStage2SoldierMap.id.toString(),
      page: "2",
      pageSize: "1",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert(res.ok);
    assert.notEqual(res.body, null);
    assert.partialDeepStrictEqual(res.body, [
      {
        id: testAllOutStage2LeaderboardItem1.id,
        user: {
          steamId64: testUser1.steamId64,
        },
        pr: {
          seconds: testAllOutStage2LeaderboardItem1.prSeconds,
          timestamp: testAllOutStage2LeaderboardItem1.prTimestamp.toISOString(),
        },
        lap: {
          count: testAllOutStage2LeaderboardItem1.lapCount,
          lastTimestamp: testAllOutStage2LeaderboardItem1.lastLapTimestamp.toISOString(),
        },
      },
    ]);
    assert.partialDeepStrictEqual(Object.keys(res.body[0].user), ["name", "avatar"]);
  });

  it("returns no items when page param is too big", async () => {
    const queryParams = new URLSearchParams({
      mapId: testAllOutStage2SoldierMap.id.toString(),
      page: "10",
      pageSize: "2",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

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
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

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
