import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { TournamentEventType } from "#/db-entities/TournamentEvent";
import { TournamentMatchupType } from "#/db-entities/TournamentMatchup";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tournamentMatchupIncludedParticipantValidator } from "#/tournaments/validators/tournament-matchup-included-participant.validator";
import { tournamentMatchupUniqueParticipantValidator } from "#/tournaments/validators/tournament-matchup-unique-participant.validator";

import { testHeadAdmin, testUser1, testUser2, testUser3, testUser4 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { assortMatchups, sortByBracketAndOrderIndex } from "./util";

function request(eventId: number, setMatchups?: object) {
  return supertest(app).post(`/tournaments/events/${eventId}/set-brackets`).send(setMatchups);
}

const entities: BaseEntity[] = [];
describe("POST /tournaments/events/:eventId/set-brackets", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    teardownApiTestSuiteAsync(entities);
  });

  it("sets event matchups", async () => {
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
    const setMatchups = {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event.id, setMatchups));

    assert.equal(res.status, 204);
    const createdMatchups = await ctx.tournaments.matchups.find(
      { event },
      { populate: ["participant1:ref", "participant2:ref"] },
    );
    assert.lengthOf(createdMatchups, 6);
    const winnerMatchups = createdMatchups
      .filter((m) => m.type === TournamentMatchupType.WINNER)
      .sort(sortByBracketAndOrderIndex);
    const loserMatchups = createdMatchups
      .filter((m) => m.type === TournamentMatchupType.LOSER)
      .sort(sortByBracketAndOrderIndex);
    const firstBracketParticipants = winnerMatchups
      .filter((m) => m.bracketIndex === 0)
      .map((m) => [m.participant1?.id, m.participant2?.id]);
    assert.deepStrictEqual(firstBracketParticipants, [
      [participant1.id, participant2.id],
      [participant3.id, participant4.id],
    ]);
    assert.deepStrictEqual(
      winnerMatchups.map((m) => m.orderIndex),
      [1, 2, 3, 6],
    );
    assert.deepStrictEqual(
      loserMatchups.map((m) => m.orderIndex),
      [4, 5],
    );
    [winnerMatchups[0], winnerMatchups[1]].forEach((m) => {
      assert.equal(m.winnerNextMatchup?.id, winnerMatchups[2].id);
      assert.equal(m.loserNextMatchup?.id, loserMatchups[0].id);
    });
    [winnerMatchups[2], loserMatchups[1]].forEach((m) => {
      assert.equal(m.winnerNextMatchup?.id, winnerMatchups[3].id);
    });
    assert.equal(winnerMatchups[2].loserNextMatchup?.id, loserMatchups[1].id);
    assert.notExists(winnerMatchups[3].winnerNextMatchup);
    assert.notExists(winnerMatchups[3].loserNextMatchup);
    loserMatchups.forEach((m) => assert.notExists(m.loserNextMatchup));
    [winnerMatchups[0], winnerMatchups[2]].forEach((m) => {
      assert.equal(m.winnerNextMatchupParticipantIndex, 0);
      assert.equal(m.loserNextMatchupParticipantIndex, 0);
    });
    [winnerMatchups[1], loserMatchups[0], loserMatchups[1]].forEach((m) => {
      assert.equal(m.winnerNextMatchupParticipantIndex, 1);
    });
    assert.equal(winnerMatchups[1].loserNextMatchupParticipantIndex, 1);
  });

  it("sets event matchups with alternating format", async () => {
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
    const setMatchups = {
      format: "alternating",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event.id, setMatchups));

    assert.equal(res.status, 204);
    const createdMatchups = await ctx.tournaments.matchups.find(
      { event },
      { populate: ["participant1:ref", "participant2:ref"] },
    );
    const { winnerMatchups, loserMatchups } = assortMatchups(createdMatchups);
    assert.deepStrictEqual(
      winnerMatchups.map((m) => m.orderIndex),
      [1, 2, 4, 6],
    );
    assert.deepStrictEqual(
      loserMatchups.map((m) => m.orderIndex),
      [3, 5],
    );
  });

  it("returns validation error when not all participants are included in matchups", async () => {
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
    const setMatchups = {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event.id, setMatchups));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentMatchupIncludedParticipantValidator.getMessages([
        participant3.id,
        participant4.id,
      ]),
    });
  });

  it("returns validation error when there are duplicate participants in matchups", async () => {
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
    const setMatchups = {
      format: "linear",
      matchups: [
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant1.id, participant2.id],
        },
        {
          participantIds: [participant3.id, participant4.id],
        },
      ],
    };

    const res = await loginAs(testHeadAdmin, request(event.id, setMatchups));

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: tournamentMatchupUniqueParticipantValidator.getMessages([
        participant1.id,
        participant2.id,
      ]),
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(testHeadAdmin, request(200_000, {}));

    assert.equal(res.status, 400);
  });

  it("returns event not found error when event doesn't exist", async () => {
    const setMatchups = {
      format: "linear",
      matchups: [],
    };

    const res = await loginAs(testHeadAdmin, request(200_000, setMatchups));

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });
});
