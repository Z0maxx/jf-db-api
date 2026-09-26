import { ctx } from "#/db-context";
import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { AllOutParticipant } from "#/db-entities/AllOutParticipant";
import { AllOutStage1LeaderboardItem } from "#/db-entities/AllOutStage1LeaderboardItem";
import { AllOutStage1Map } from "#/db-entities/AllOutStage1Map";
import { AllOutStage2LeaderboardItem } from "#/db-entities/AllOutStage2LeaderboardItem";
import { AllOutStage2Map } from "#/db-entities/AllOutStage2Map";
import { AllOutStage3LeaderboardItem } from "#/db-entities/AllOutStage3LeaderboardItem";
import { AllOutStage3Map } from "#/db-entities/AllOutStage3Map";

import { testSoldierDivision, testDemomanDivision, testUser1, testUser2 } from "../test-entities";

export let testAllOutEvent: AllOutEvent;
export let testAllOutStage1SoldierMap: AllOutStage1Map;
export let testAllOutStage1DemomanMap: AllOutStage1Map;
export let testAllOutStage2SoldierMap: AllOutStage2Map;
export let testAllOutStage2DemomanMap: AllOutStage2Map;
export let testAllOutStage3SoldierMap: AllOutStage3Map;
export let testAllOutStage3DemomanMap: AllOutStage3Map;
export let testAllOutParticipant1: AllOutParticipant;
export let testAllOutParticipant2: AllOutParticipant;
export let testAllOutStage1LeaderboardItem1: AllOutStage1LeaderboardItem;
export let testAllOutStage1LeaderboardItem2: AllOutStage1LeaderboardItem;
export let testAllOutStage2LeaderboardItem1: AllOutStage2LeaderboardItem;
export let testAllOutStage2LeaderboardItem2: AllOutStage2LeaderboardItem;
export let testAllOutStage3LeaderboardItem1: AllOutStage3LeaderboardItem;
export let testAllOutStage3LeaderboardItem2: AllOutStage3LeaderboardItem;

export async function createAllOutTestEntitiesAsync() {
  testAllOutEvent = await ctx.allOut.events.upsert({
    id: 100_000,
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

  [testAllOutStage1SoldierMap, testAllOutStage1DemomanMap] = await ctx.allOut.stage1Maps.upsertMany(
    [
      {
        id: 100_001,
        name: "test stage 1 soldier map",
        timeLimit: 10,
        event: testAllOutEvent,
        division: testSoldierDivision,
      },
      {
        id: 100_002,
        name: "test stage 1 demoman map",
        timeLimit: 11,
        event: testAllOutEvent,
        division: testDemomanDivision,
      },
    ],
  );

  [testAllOutStage2SoldierMap, testAllOutStage2DemomanMap] = await ctx.allOut.stage2Maps.upsertMany(
    [
      {
        id: 100_001,
        name: "test stage 2 soldier map",
        event: testAllOutEvent,
        division: testSoldierDivision,
      },
      {
        id: 100_002,
        name: "test stage 2 demoman map",
        event: testAllOutEvent,
        division: testDemomanDivision,
      },
    ],
  );

  [testAllOutStage3SoldierMap, testAllOutStage3DemomanMap] = await ctx.allOut.stage3Maps.upsertMany(
    [
      {
        id: 100_001,
        name: "test stage 3 soldier map",
        event: testAllOutEvent,
        division: testSoldierDivision,
      },
      {
        id: 100_002,
        name: "test stage 3 demoman map",
        event: testAllOutEvent,
        division: testDemomanDivision,
      },
    ],
  );

  [testAllOutParticipant1, testAllOutParticipant2] = await ctx.allOut.participants.upsertMany([
    {
      id: 100_001,
      user: testUser1,
      event: testAllOutEvent,
    },
    {
      id: 100_002,
      user: testUser2,
      event: testAllOutEvent,
    },
  ]);

  testAllOutParticipant1.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  testAllOutParticipant2.divisionCollection.set([testSoldierDivision, testDemomanDivision]);
  await ctx.saveAsync();

  [testAllOutStage1LeaderboardItem1, testAllOutStage1LeaderboardItem2] =
    await ctx.allOut.stage1Leaderboard.upsertMany([
      {
        id: 100_001,
        prSeconds: 101,
        prTimestamp: new Date("2030-01-01 11:11"),
        participant: testAllOutParticipant1,
        map: testAllOutStage1SoldierMap,
      },
      {
        id: 100_002,
        prSeconds: 102,
        prTimestamp: new Date("2030-01-01 11:12"),
        participant: testAllOutParticipant2,
        map: testAllOutStage1SoldierMap,
      },
    ]);

  [testAllOutStage2LeaderboardItem1, testAllOutStage2LeaderboardItem2] =
    await ctx.allOut.stage2Leaderboard.upsertMany([
      {
        id: 100_001,
        prSeconds: 101,
        prTimestamp: new Date("2030-01-01 11:11"),
        participant: testAllOutParticipant1,
        lapCount: 1,
        lastLapTimestamp: new Date("2030-01-01 19:11"),
        map: testAllOutStage2SoldierMap,
      },
      {
        id: 100_002,
        prSeconds: 102,
        prTimestamp: new Date("2030-01-01 11:12"),
        participant: testAllOutParticipant2,
        lapCount: 2,
        lastLapTimestamp: new Date("2030-01-01 19:12"),
        map: testAllOutStage2SoldierMap,
      },
    ]);

  [testAllOutStage3LeaderboardItem1, testAllOutStage3LeaderboardItem2] =
    await ctx.allOut.stage3Leaderboard.upsertMany([
      {
        id: 100_001,
        prSeconds: 101,
        prTimestamp: new Date("2030-01-01 11:11"),
        participant: testAllOutParticipant1,
        map: testAllOutStage3SoldierMap,
      },
      {
        id: 100_002,
        prSeconds: 102,
        prTimestamp: new Date("2030-01-01 11:12"),
        participant: testAllOutParticipant2,
        map: testAllOutStage3SoldierMap,
      },
    ]);
}
