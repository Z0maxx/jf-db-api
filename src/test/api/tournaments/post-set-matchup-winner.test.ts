import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { TournamentEventType } from "#/db-entities/TournamentEvent";
import { tournamentsService } from "#/tournaments/tournaments.service";

import { testHeadAdmin, testUser1, testUser2, testUser3, testUser4 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import {
  assortMatchups,
  getMatchupParticipantAliasesAsList,
  setMatchupParticipantsFromList,
} from "./util";

function request(setMatchupWinner?: object) {
  return supertest(app).post(`/tournaments/set-matchup-winner`).send(setMatchupWinner);
}

const entities: BaseEntity[] = [];
describe("POST /tournaments/set-matchup-winner", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    teardownApiTestSuiteAsync(entities);
  });

  it("in winner brackets it selects winner, sets both winner and loser next matchup participants", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: TournamentEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(event);
    const [participant1, participant2, participant3, participant4] =
      await ctx.tournaments.participants.upsertMany([
        {
          user: testUser1,
          event,
          alias: "p1",
        },
        {
          user: testUser2,
          event,
          alias: "p2",
        },
        {
          user: testUser3,
          event,
          alias: "p3",
        },
        {
          user: testUser4,
          event,
          alias: "p4",
        },
      ]);
    await tournamentsService.setMatchupsAsync(event.id, {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    });
    const matchups = await ctx.tournaments.matchups.find(
      { event },
      { populate: ["participant1", "participant2"] },
    );
    const { winnerMatchups, loserMatchups } = assortMatchups(matchups);
    const setMatchupWinner = {
      matchupId: winnerMatchups[0].id,
      winnerIndex: 0,
    };

    await loginAs(testHeadAdmin, request(setMatchupWinner));

    assert.equal(winnerMatchups[0].winnerIndex, setMatchupWinner.winnerIndex);
    assert.deepStrictEqual(
      getMatchupParticipantAliasesAsList({
        winnerMatchups,
        loserMatchups,
      }),
      {
        winnerParticipants: [
          [
            [participant1.alias, participant2.alias],
            [participant3.alias, participant4.alias],
          ],
          [[participant1.alias, null]],
          [[null, null]],
        ],
        loserParticipants: [[[participant2.alias, null]], [[null, null]]],
      },
    );
  });

  it("in winner brackets it switches participants in next matchups in both winner and loser brackets", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: TournamentEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(event);
    const [participant1, participant2, participant3, participant4] =
      await ctx.tournaments.participants.upsertMany([
        {
          user: testUser1,
          event,
          alias: "p1",
        },
        {
          user: testUser2,
          event,
          alias: "p2",
        },
        {
          user: testUser3,
          event,
          alias: "p3",
        },
        {
          user: testUser4,
          event,
          alias: "p4",
        },
      ]);
    await tournamentsService.setMatchupsAsync(event.id, {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    });
    const matchups = await ctx.tournaments.matchups.find(
      { event },
      { populate: ["participant1", "participant2"] },
    );
    const { winnerMatchups, loserMatchups } = assortMatchups(matchups);
    const setMatchupWinner = {
      matchupId: winnerMatchups[0].id,
      winnerIndex: 1,
    };
    setMatchupParticipantsFromList({
      winnerMatchups,
      loserMatchups,
      winnerParticipants: [
        [
          [participant1, participant2],
          [participant3, participant4],
        ],
        [[participant1, participant3]],
        [[participant1, participant2]],
      ],
      loserParticipants: [[[participant2, participant4]], [[participant3, participant2]]],
    });
    await ctx.saveAsync();

    await loginAs(testHeadAdmin, request(setMatchupWinner));

    assert.deepStrictEqual(
      getMatchupParticipantAliasesAsList({
        winnerMatchups,
        loserMatchups,
      }),
      {
        winnerParticipants: [
          [
            [participant1.alias, participant2.alias],
            [participant3.alias, participant4.alias],
          ],
          [[participant2.alias, participant3.alias]],
          [[participant2.alias, participant1.alias]],
        ],
        loserParticipants: [
          [[participant1.alias, participant4.alias]],
          [[participant3.alias, participant1.alias]],
        ],
      },
    );
  });

  it("in loser brackets it selects winner and sets winner next matchup participant", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: TournamentEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(event);
    const [participant1, participant2, participant3, participant4] =
      await ctx.tournaments.participants.upsertMany([
        {
          user: testUser1,
          event,
        },
        {
          user: testUser2,
          event,
        },
        {
          user: testUser3,
          event,
        },
        {
          user: testUser4,
          event,
        },
      ]);
    await tournamentsService.setMatchupsAsync(event.id, {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    });
    const matchups = await ctx.tournaments.matchups.find(
      { event },
      { populate: ["participant1", "participant2"] },
    );
    const { winnerMatchups, loserMatchups } = assortMatchups(matchups);
    setMatchupParticipantsFromList({
      winnerMatchups,
      loserMatchups,
      loserParticipants: [[[participant1, null]], [[null, null]]],
    });
    await ctx.saveAsync();
    const setMatchupWinner = {
      matchupId: loserMatchups[0].id,
      winnerIndex: 0,
    };

    await loginAs(testHeadAdmin, request(setMatchupWinner));

    assert.equal(loserMatchups[0].winnerIndex, setMatchupWinner.winnerIndex);
    assert.deepStrictEqual(
      getMatchupParticipantAliasesAsList({
        winnerMatchups,
        loserMatchups,
      }),
      {
        winnerParticipants: [
          [
            [participant1.alias, participant2.alias],
            [participant3.alias, participant4.alias],
          ],
          [[null, null]],
          [[null, null]],
        ],
        loserParticipants: [[[participant1.alias, null]], [[null, participant1.alias]]],
      },
    );
  });

  it("in loser brackets it switches participants in next matchups", async () => {
    const event = await ctx.tournaments.events.upsert({
      type: TournamentEventType.SOLDIER,
      description: "description",
      start: new Date("2030-01-01 10:00"),
      end: new Date("2030-01-01 16:00"),
    });
    entities.push(event);
    const [participant1, participant2, participant3, participant4] =
      await ctx.tournaments.participants.upsertMany([
        {
          user: testUser1,
          event,
          alias: "p1",
        },
        {
          user: testUser2,
          event,
          alias: "p2",
        },
        {
          user: testUser3,
          event,
          alias: "p3",
        },
        {
          user: testUser4,
          event,
          alias: "p4",
        },
      ]);
    await tournamentsService.setMatchupsAsync(event.id, {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    });
    const matchups = await ctx.tournaments.matchups.find(
      { event },
      { populate: ["participant1", "participant2"] },
    );
    const { winnerMatchups, loserMatchups } = assortMatchups(matchups);
    setMatchupParticipantsFromList({
      winnerMatchups,
      loserMatchups,
      winnerParticipants: [
        [
          [participant1, participant2],
          [participant3, participant4],
        ],
        [[participant1, participant3]],
        [[participant1, participant2]],
      ],
      loserParticipants: [[[participant2, participant4]], [[participant3, participant2]]],
    });
    await ctx.saveAsync();
    const setMatchupWinner = {
      matchupId: loserMatchups[0].id,
      winnerIndex: 1,
    };

    await loginAs(testHeadAdmin, request(setMatchupWinner));

    assert.deepStrictEqual(
      getMatchupParticipantAliasesAsList({
        winnerMatchups,
        loserMatchups,
      }),
      {
        winnerParticipants: [
          [
            [participant1.alias, participant2.alias],
            [participant3.alias, participant4.alias],
          ],
          [[participant1.alias, participant3.alias]],
          [[participant1.alias, participant4.alias]],
        ],
        loserParticipants: [
          [[participant2.alias, participant4.alias]],
          [[participant3.alias, participant4.alias]],
        ],
      },
    );
  });
});
