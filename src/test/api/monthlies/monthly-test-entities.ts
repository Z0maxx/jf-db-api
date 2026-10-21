import { ctx } from "#/db-context";
import { MonthlyEvent, MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { MonthlyLeaderboardItem } from "#/db-entities/MonthlyLeaderboardItem";
import { MonthlyMap } from "#/db-entities/MonthlyMap";
import { MonthlyParticipant } from "#/db-entities/MonthlyParticipant";

import { testSoldierDivision, testUser1, testUser2 } from "../test-entities";

export let testMonthlyEvent: MonthlyEvent;
export let testMonthlyMap: MonthlyMap;
export let testMonthlyParticipant1: MonthlyParticipant;
export let testMonthlyParticipant2: MonthlyParticipant;
export let testMonthlyLeaderboardItem1: MonthlyLeaderboardItem;
export let testMonthlyLeaderboardItem2: MonthlyLeaderboardItem;

export async function createMonthlyTestEntitiesAsync() {
  testMonthlyEvent = await ctx.monthlies.events.upsert({
    id: 100_000,
    type: MonthlyEventType.SOLDIER,
    description: "monthly event description",
    start: new Date("2030-01-01 10:00"),
    end: new Date("2030-01-31 16:00"),
    canceled: false,
  });

  testMonthlyMap = await ctx.monthlies.maps.upsert({
    id: 100_000,
    name: "monthly map",
    division: testSoldierDivision,
    event: testMonthlyEvent,
  });

  [testMonthlyParticipant1, testMonthlyParticipant2] = await ctx.monthlies.participants.upsertMany([
    {
      id: 100_001,
      user: testUser1,
      division: testSoldierDivision,
      event: testMonthlyEvent,
      resigned: false,
    },
    {
      id: 100_002,
      user: testUser2,
      division: testSoldierDivision,
      event: testMonthlyEvent,
      resigned: false,
    },
  ]);

  [testMonthlyLeaderboardItem1, testMonthlyLeaderboardItem2] =
    await ctx.monthlies.leaderboard.upsertMany([
      {
        id: 100_001,
        prSeconds: 301,
        prTimestamp: new Date("2030-01-01 11:11"),
        participant: testMonthlyParticipant1,
        map: testMonthlyMap,
        verified: true,
      },
      {
        id: 100_002,
        prSeconds: 302,
        prTimestamp: new Date("2030-01-01 11:12"),
        participant: testMonthlyParticipant2,
        map: testMonthlyMap,
        verified: false,
      },
    ]);
}
