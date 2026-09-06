import app from "@/app";
import ctx, { initCtx } from "@/db-context";
import { AllOutEvent } from "@/db-entities/AllOutEvent";
import { AllOutStage2LeaderboardItem } from "@/db-entities/AllOutStage2LeaderboardItem";
import { MapNotFoundError } from "@/errors";
import { LapLeaderboardItem } from "@/types";
import { EntityManager } from "@mikro-orm/core";
import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { AllOutStage2Map } from "@/db-entities/AllOutStage2Map";

const testEvent = {
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
};

const testStage2Map = {
  name: "jump_stage_2_map",
};

const testLeaderboardItems = [
  {
    steamId64: "76561198138925802",
    prSeconds: 101,
    prTimestamp: new Date("2030-01-01 11:11"),
    lapCount: 1,
    lastLapTimestamp: new Date("2030-01-01 11:21"),
  },
  {
    steamId64: "76561198059284918",
    prSeconds: 102,
    prTimestamp: new Date("2030-01-01 11:12"),
    lapCount: 2,
    lastLapTimestamp: new Date("2030-01-01 11:22"),
  },
  {
    steamId64: "76561198167723343",
    prSeconds: 103,
    prTimestamp: new Date("2030-01-01 11:13"),
    lapCount: 3,
    lastLapTimestamp: new Date("2030-01-01 11:23"),
  },
  {
    steamId64: "76561198046214898",
    prSeconds: 104,
    prTimestamp: new Date("2030-01-01 11:14"),
    lapCount: 4,
    lastLapTimestamp: new Date("2030-01-01 11:24"),
  },
];

const eventsToDelete: AllOutEvent[] = [];
let em: EntityManager = null!;
describe("GET /all-out/leaderboard/stage-2", () => {
  before(async () => {
    await initCtx();
    em = ctx.em.fork();
  });

  after(async () => {
    eventsToDelete.forEach((e) => em.remove(e));
    await em.flush();
    await ctx.orm.close(true);
  });

  it("returns paged stage 2 leaderboard", async () => {
    const event = em.create(AllOutEvent, testEvent);
    eventsToDelete.push(event);
    const map = em.create(AllOutStage2Map, {
      ...testStage2Map,
      event,
    });
    const [_, __, item3, item4] = testLeaderboardItems.map((item) =>
      em.create(AllOutStage2LeaderboardItem, {
        ...item,
        map,
      }),
    );
    await em.flush();

    const queryParams = new URLSearchParams({
      mapId: map.id.toString(),
      page: "2",
      pageSize: "2",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert(res.ok);
    assert.notEqual(res.body, null);
    assert.partialDeepStrictEqual(res.body, [
      {
        id: item3.id,
        pr: {
          seconds: item3.prSeconds,
          timestamp: item3.prTimestamp.toISOString(),
        },
        lap: {
          count: item3.lapCount,
          lastTimestamp: item3.lastLapTimestamp.toISOString(),
        },
      },
      {
        id: item4.id,
        pr: {
          seconds: item4.prSeconds,
          timestamp: item4.prTimestamp.toISOString(),
        },
        lap: {
          count: item4.lapCount,
          lastTimestamp: item4.lastLapTimestamp.toISOString(),
        },
      },
    ]);

    assert.deepEqual(Object.keys(res.body[0].user), ["steamId64", "name", "avatar"]);
  });

  it("returns stage 2 leaderboard with descending lap count", async () => {
    const event = em.create(AllOutEvent, testEvent);
    eventsToDelete.push(event);
    const map = em.create(AllOutStage2Map, {
      ...testStage2Map,
      event,
    });
    testLeaderboardItems.forEach((item) =>
      em.create(AllOutStage2LeaderboardItem, {
        ...item,
        map,
      }),
    );
    await em.flush();

    const queryParams = new URLSearchParams({
      mapId: map.id.toString(),
      page: "1",
      pageSize: "50",
      order: "DESC",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert(res.ok);
    assert.notEqual(res.body, null);
    const laps = (res.body as LapLeaderboardItem[]).map((item) => item.lap.count);
    for (let i = 0; i < laps.length - 1; i++) {
      assert(laps[i] > laps[i + 1]);
    }
  });

  it("returns no items when page param is too big", async () => {
    const event = em.create(AllOutEvent, testEvent);
    eventsToDelete.push(event);
    const map = em.create(AllOutStage2Map, {
      ...testStage2Map,
      event,
    });
    testLeaderboardItems.forEach((item) =>
      em.create(AllOutStage2LeaderboardItem, {
        ...item,
        map,
      }),
    );
    await em.flush();

    const queryParams = new URLSearchParams({
      mapId: map.id.toString(),
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
      mapId: "100000",
      page: "2",
      pageSize: "2",
    });
    const res = await request(app).get("/all-out/leaderboard/stage-2?" + queryParams);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, new MapNotFoundError(100_000).message);
  });
});
