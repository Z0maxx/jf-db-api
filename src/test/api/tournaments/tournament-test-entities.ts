import { ctx } from "#/db-context";
import { TournamentEvent, TournamentEventType } from "#/db-entities/TournamentEvent";
import { TournamentMap } from "#/db-entities/TournamentMap";
import { TournamentParticipant } from "#/db-entities/TournamentParticipant";

import { testUser1 } from "../test-entities";

export let testTournamentEvent: TournamentEvent;
export let testTournamentParticipant: TournamentParticipant;
export let testTournamentMap: TournamentMap;

export async function createTournamentTestEntitiesAsync() {
  testTournamentEvent = await ctx.tournaments.events.upsert({
    id: 100_000,
    type: TournamentEventType.SOLDIER,
    description: "tournament event description",
    start: new Date("2030-01-01 10:00"),
    end: new Date("2030-01-01 16:00"),
    canceled: false,
  });

  testTournamentParticipant = await ctx.tournaments.participants.upsert({
    id: 100_000,
    alias: "user 1",
    user: testUser1,
    event: testTournamentEvent,
  });

  testTournamentMap = await ctx.tournaments.maps.upsert({
    id: 100_000,
    name: "tournament map",
    event: testTournamentEvent,
  });
}
