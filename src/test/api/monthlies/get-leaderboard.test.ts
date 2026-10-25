import "dotenv/config";
import { BaseEntity } from "@mikro-orm/core";
import { Server } from "node:http";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { authService } from "#/auth/auth.service";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { MapNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";

import { testSoldierDivision, testUser1, testUser2 } from "../test-entities";
import {
  createServerAsync,
  getSingleSseResponseAsync,
  getSSeResponsesAsync,
  setupApiTestSuiteAsync,
  teardownApiTestSuiteAsync,
} from "../util";
import {
  testMonthlyLeaderboardItem1,
  testMonthlyLeaderboardItem2,
  testMonthlyMap,
} from "./monthly-test-entities";

let server: Server;

const entities: BaseEntity[] = [];
describe("GET /monthlies/leaderboard/:mapId", () => {
  beforeAll(async () => {
    server = await createServerAsync(4001);
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
    server.close();
  });

  it("sends SSE of leaderboard", async () => {
    const res = await getSingleSseResponseAsync(
      "http://localhost:4001/monthlies/leaderboard/" + testMonthlyMap.id,
    );

    assert.lengthOf(res, 2);
    assert.hasAnyKeys(res[0].user, ["name", "avatar"]);
    assert.containSubset(res, [
      {
        id: testMonthlyLeaderboardItem1.id,
        user: {
          steam64Id: testUser1.steam64Id,
        },
        pr: {
          verified: true,
          seconds: testMonthlyLeaderboardItem1.prSeconds,
          timestamp: testMonthlyLeaderboardItem1.prTimestamp.toISOString(),
        },
      },
      {
        id: testMonthlyLeaderboardItem2.id,
        user: {
          steam64Id: testUser2.steam64Id,
        },
        pr: {
          verified: false,
          seconds: testMonthlyLeaderboardItem2.prSeconds,
          timestamp: testMonthlyLeaderboardItem2.prTimestamp.toISOString(),
        },
      },
    ]);
  });

  it("sends SSE of updated leaderboard when time is submitted", async () => {
    const event = await ctx.monthlies.events.upsert({
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
      description: "description",
      type: MonthlyEventType.SOLDIER,
    });
    entities.push(event);
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    const map = await ctx.monthlies.maps.upsert({
      name: "jump_ionizer_tpn4",
      division: testSoldierDivision,
      event,
    });

    const leaderboardResponses = getSSeResponsesAsync(
      "http://localhost:4001/monthlies/leaderboard/" + map.id,
      { responseCount: 2 },
    );
    const submitResponse = await getSingleSseResponseAsync(
      `http://localhost:4001/monthlies/events/${event.id}/submit-time`,
      {
        method: "POST",
        body: {
          timeSeconds: 300,
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authService.getToken({ id: testUser1.id }),
        },
      },
    );

    assert.equal(submitResponse.status, "accepted");
    const res = await leaderboardResponses;
    assert.lengthOf(res, 2);
    assert.lengthOf(res[0], 0);
    assert.lengthOf(res[1], 1);
  });

  it("returns map not found error when map doesn't exist", async () => {
    const res = await getSingleSseResponseAsync(
      "http://localhost:4001/monthlies/leaderboard/200000",
    );

    assert.deepStrictEqual(res, getAppError(new MapNotFoundError(200_000)));
  });
});
