import { ctx } from "#/db-context";
import { LanEvent } from "#/db-entities/LanEvent";
import { LanMap, LanMapType } from "#/db-entities/LanMap";
import { LanParticipant } from "#/db-entities/LanParticipant";

import { testUser1 } from "../test-entities";

export let testLanEvent: LanEvent = null!;
export let testLanParticipant: LanParticipant = null!;
export let testLanSoldierMap: LanMap = null!;
export let testLanDemomanMap: LanMap = null!;

export async function createLanTestEntitiesAsync() {
  testLanEvent = await ctx.lan.events.upsert({
    id: 100_000,
    name: "lan event",
    description: "description",
    posterUrl: "https://poland.tf/wp-content/uploads/2026/09/poland2027.jpg",
    trailerUrl: "https://www.youtube.com/watch?v=mJE42pzZzv0",
    start: new Date("2030-01-01 10:00"),
    end: new Date("2030-01-01 16:00"),
    canceled: false,
  });

  testLanParticipant = await ctx.lan.participants.upsert({
    id: 100_000,
    alias: "user 1",
    user: testUser1,
    event: testLanEvent,
  });

  testLanEvent.lanParticipantCollection.set([testLanParticipant]);

  [testLanSoldierMap, testLanDemomanMap] = await ctx.lan.maps.upsertMany([
    {
      id: 100_001,
      type: LanMapType.SOLDIER,
      name: "soldier map",
      event: testLanEvent,
    },
    {
      id: 100_002,
      type: LanMapType.DEMOMAN,
      name: "demoman map",
      event: testLanEvent,
    },
  ]);

  testLanEvent.lanMapCollection.set([testLanSoldierMap, testLanDemomanMap]);
}
