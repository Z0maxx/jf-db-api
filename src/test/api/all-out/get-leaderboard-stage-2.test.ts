import { app } from "#/app";
import { ctx } from "#/db-context";
import { MapNotFoundError } from "#/errors";
import { BaseEntity } from "@mikro-orm/core";
import request from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { testSoldierDivision, testUser1 } from "../test-entities";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import {
  testAllOutStage2LeaderboardItem1,
  testAllOutStage2SoldierMap,
} from "./all-out-test-entities";

const entities: BaseEntity[] = [];
describe("GET /all-out/leaderboard/stage-2", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("returns paged stage 2 leaderboard", async () => {
    const queryParams = new URLSearchParams({
      mapId: testAllOutStage2SoldierMap.id.toString(),
      page: "2",
      pageSize: "1",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert(res.ok);
    assert.hasAnyKeys(res.body[0].user, ["name", "avatar"]);
    assert.containsSubset(res.body, [
      {
        id: testAllOutStage2LeaderboardItem1.id,
        user: {
          steam64Id: testUser1.steam64Id,
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
  });

  it("returns no items when page param is too big", async () => {
    const queryParams = new URLSearchParams({
      mapId: testAllOutStage2SoldierMap.id.toString(),
      page: "10",
      pageSize: "2",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert(res.ok);
    assert.isEmpty(res.body);
  });

  it("doesn't return resigned participant's items", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date("2030-01-01 10:00"),
      stage1End: new Date("2030-01-01 16:00"),
      stage2Start: new Date("2030-01-02 10:00"),
      stage2End: new Date("2030-01-02 16:00"),
      stage3Start: new Date("2030-01-03 10:00"),
      stage3End: new Date("2030-01-03 16:00"),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);
    const map = await ctx.allOut.stage2Maps.upsert({
      name: "test stage 2 soldier map",
      division: testSoldierDivision,
      event,
    });
    const participant = await ctx.allOut.participants.upsert({
      user: testUser1,
      resigned: true,
      event,
    });
    await ctx.allOut.stage2Leaderboard.upsert({
      prSeconds: 101,
      prTimestamp: new Date("2030-01-01 11:11"),
      lapCount: 1,
      lastLapTimestamp: new Date("2030-01-01 19:11"),
      map,
      participant,
    });

    const queryParams = new URLSearchParams({
      mapId: map.id.toString(),
      page: "1",
      pageSize: "1",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert.ok(res.ok);
    assert.isEmpty(res.body);
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
