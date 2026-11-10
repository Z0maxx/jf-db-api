import { Loaded, Ref, Reference, wrap } from "@mikro-orm/core";

import { ctx } from "#/db-context";
import { TournamentEvent } from "#/db-entities/TournamentEvent";
import { TournamentMatchup, TournamentMatchupType } from "#/db-entities/TournamentMatchup";
import { TournamentParticipant } from "#/db-entities/TournamentParticipant";
import { Registration } from "#/types";

import {
  CreateTournamentEventDto,
  CreateTournamentParticipantDto,
  LoadedTournamentMatchup,
  SetTournamentMatchupsDto,
} from "./tournaments.types";

export const tournamentsRepository = {
  async getAllEventsAsync() {
    return await ctx.tournaments.events.findAll();
  },

  async getEventByIdAsync(eventId: number) {
    return await ctx.tournaments.events.findOne(
      { id: eventId },
      {
        populate: [
          "tournamentMapCollection",
          "tournamentParticipantCollection.user.divisionCollection",
        ],
      },
    );
  },

  async getMatchupByIdAsync(matchupId: number) {
    return await ctx.tournaments.matchups.findOne(
      { id: matchupId },
      {
        populate: ["participant1:ref", "participant2:ref", "winnerNextMatchup", "loserNextMatchup"],
      },
    );
  },

  async getParticipantByRegistrationAsync(registration: Registration) {
    return await ctx.tournaments.participants.findOne({
      event: registration.eventId,
      user: registration.user.id,
    });
  },

  async getParticipantByIdAsync(participantId: number) {
    return await ctx.tournaments.participants.findOne({ id: participantId });
  },

  async getEventMatchupsAsync(eventId: number) {
    return await ctx.tournaments.matchups.find(
      {
        event: eventId,
      },
      {
        populate: ["participant1.user.steam64Id", "participant2.user.steam64Id"],
      },
    );
  },

  async mapExistsAsync(mapId: number) {
    return (await ctx.tournaments.maps.findOne({ id: mapId })) !== null;
  },

  async createEventAsync(event: CreateTournamentEventDto) {
    const createdEvent = ctx.tournaments.events.create(transformToDbTournamentEvent(event));
    await setMapsAsync(createdEvent, event.maps);
    await setParticipantsAsync(createdEvent, event.participants);
    await ctx.saveAsync();
    return createdEvent.id;
  },

  async updateEventAsync(originalEvent: TournamentEvent, event: CreateTournamentEventDto) {
    wrap(originalEvent).assign(transformToDbTournamentEvent(event));
    await setMapsAsync(originalEvent, event.maps);
    await setParticipantsAsync(originalEvent, event.participants);
    await ctx.saveAsync();
  },

  async setMatchupsAsync(event: TournamentEvent, setMatchups: SetTournamentMatchupsDto) {
    const existing = await ctx.tournaments.matchups.find({ event });
    existing.forEach((e) => ctx.em.remove(e));
    const { winnerBrackets } = createBrackets(event, setMatchups);
    await setMatchupParticipantsAsync(winnerBrackets, setMatchups.matchups);
    await ctx.saveAsync();
  },

  async setMatchupWinnerAsync(matchup: LoadedTournamentMatchup, winnerIndex: 0 | 1) {
    matchup.winnerIndex = winnerIndex;
    const participants = [matchup.participant1, matchup.participant2];
    const winner = participants[winnerIndex]!;
    const loser = participants[1 - winnerIndex];
    if (matchup.winnerNextMatchup) {
      await addWinnerParticipantToNextMatchupAsync(matchup, winner);
      if (loser) {
        const matchups = await ctx.tournaments.matchups.find(
          { event: matchup.event },
          { populate: ["winnerNextMatchup"] },
        );

        const matchupsMap = new Map(matchups.map((m) => [m.id, m]));
        await switchMatchupParticipantsAsync(matchupsMap, matchup, loser, winner);
        if (matchup.loserNextMatchup) {
          await addLoserParticipantToNextMatchupAsync(matchup, loser);
          const loserNextMatchup = matchupsMap.get(matchup.loserNextMatchup.id)!;
          await switchMatchupParticipantsAsync(matchupsMap, loserNextMatchup, winner, loser);
        }
      }
    }

    await ctx.saveAsync();
  },

  async disqualifyParticipantAsync(participant: TournamentParticipant) {
    participant.disqualified = true;
    await ctx.saveAsync();
  },

  async deleteEventAsync(event: TournamentEvent) {
    ctx.em.remove(event);
    await ctx.saveAsync();
  },

  async cancelEventAsync(event: TournamentEvent) {
    event.canceled = true;
    await ctx.saveAsync();
  },
};

function transformToDbTournamentEvent(event: CreateTournamentEventDto) {
  return {
    type: event.type,
    description: event.description,
    start: event.start,
  };
}

async function setMapsAsync(event: TournamentEvent, maps: string[]) {
  const mapNames = new Set(maps);
  const existing = await ctx.tournaments.maps.find({ event });
  existing.filter((m) => !mapNames.has(m.name)).forEach((m) => ctx.em.remove(m));

  const existingNames = new Set(existing.map((m) => m.name));
  [...mapNames]
    .filter((n) => !existingNames.has(n))
    .forEach((name) => ctx.tournaments.maps.create({ name, event }));
}

async function setParticipantsAsync(
  event: TournamentEvent,
  participants: CreateTournamentParticipantDto[],
) {
  const participantsMap = new Map<number, CreateTournamentParticipantDto>(
    participants.map((p) => [p.userId, p]),
  );
  const existing = await ctx.tournaments.participants.find({ event }, { populate: ["user"] });
  const deleted = existing.filter((p) => !participantsMap.has(p.user.id));
  deleted.forEach((p) => ctx.em.remove(p));
  existing
    .filter((p) => !deleted.includes(p))
    .forEach((p) => {
      p.alias = participantsMap.get(p.user.id)!.alias ?? "";
      participantsMap.delete(p.user.id);
    });

  participantsMap.values().forEach((p) =>
    ctx.tournaments.participants.create({
      alias: p.alias ?? "",
      user: p.userId,
      event,
    }),
  );
}

function createBrackets(event: TournamentEvent, setMatchups: SetTournamentMatchupsDto) {
  const winnerBrackets: TournamentMatchup[][] = [];
  const loserBrackets: TournamentMatchup[][] = [];
  let { winnerBracketCount, loserBracketCount, winnerMatchupCount, loserMatchupCount } =
    getBracketsCounts(setMatchups);

  for (let i = 0; i < winnerBracketCount; i++) {
    const bracket: TournamentMatchup[] = [];
    for (let j = 0; j < winnerMatchupCount; j++) {
      bracket.push(
        ctx.tournaments.matchups.create({
          type: TournamentMatchupType.WINNER,
          bracketIndex: i,
          orderIndex: -1,
          matchupIndex: j,
          winnerIndex: null,
          winnerNextMatchupParticipantIndex: null,
          loserNextMatchupParticipantIndex: null,
          event,
        }),
      );
    }

    winnerBrackets.push(bracket);
    winnerMatchupCount = Math.ceil(winnerMatchupCount / 2);
  }

  for (let i = 0; i < loserBracketCount; i++) {
    const bracket: TournamentMatchup[] = [];
    for (let j = 0; j < loserMatchupCount; j++) {
      bracket.push(
        ctx.tournaments.matchups.create({
          type: TournamentMatchupType.LOSER,
          bracketIndex: i,
          orderIndex: -1,
          matchupIndex: j,
          winnerIndex: null,
          loserNextMatchupParticipantIndex: null,
          event,
        }),
      );
    }

    loserBrackets.push(bracket);
    if (i % 2 === 1) {
      loserMatchupCount /= 2;
    }
  }

  const { winnerBracketsOrders, loserBracketsOrders } = getBracketsOrders(
    setMatchups.format,
    winnerBrackets,
    loserBrackets,
  );

  for (let i = 0; i < winnerBrackets.length; i++) {
    const bracket = winnerBrackets[i];
    for (let j = 0; j < bracket.length; j++) {
      const matchup = bracket[j];
      matchup.orderIndex = winnerBracketsOrders[i][j];
      if (i < winnerBrackets.length - 1) {
        matchup.winnerNextMatchup = Reference.create(winnerBrackets[i + 1][Math.floor(j / 2)]);
        if (i === 0) {
          matchup.loserNextMatchup = Reference.create(loserBrackets[0][Math.floor(j / 2)]);
        } else {
          matchup.loserNextMatchup = Reference.create(loserBrackets[i * 2 - 1][j]);
        }

        matchup.winnerNextMatchupParticipantIndex = getWinnerNextMatchupParticipantIndex(matchup);
        matchup.loserNextMatchupParticipantIndex = getLoserNextMatchupParticipantIndex(matchup);
      }
    }
  }

  for (let i = 0; i < loserBrackets.length; i++) {
    const bracket = loserBrackets[i];
    for (let j = 0; j < bracket.length; j++) {
      const matchup = bracket[j];
      matchup.orderIndex = loserBracketsOrders[i][j];
      if (i === loserBrackets.length - 1) {
        matchup.winnerNextMatchup = Reference.create(winnerBrackets[winnerBrackets.length - 1][0]);
      } else if (i % 2 === 0) {
        matchup.winnerNextMatchup = Reference.create(loserBrackets[i + 1][j]);
      } else {
        matchup.winnerNextMatchup = Reference.create(loserBrackets[i + 1][Math.floor(j / 2)]);
      }

      matchup.winnerNextMatchupParticipantIndex = getWinnerNextMatchupParticipantIndex(matchup);
    }
  }

  return {
    winnerBrackets,
    loserBrackets,
  };
}

async function setMatchupParticipantsAsync(
  winnerBrackets: TournamentMatchup[][],
  matchups: SetTournamentMatchupsDto["matchups"],
) {
  const firstBracket = winnerBrackets[0];
  const allParticipantIds = matchups.map((m) => m.participantIds).flat();
  const participants = await ctx.tournaments.participants.find({ id: { $in: allParticipantIds } });
  for (let i = 0; i < firstBracket.length; i++) {
    const participantIds = matchups[i].participantIds;
    firstBracket[i].participant1 = Reference.create(
      participants.find((p) => p.id === participantIds[0])!,
    );
    firstBracket[i].participant2 = Reference.create(
      participants.find((p) => p.id === participantIds[1])!,
    );
  }
}

function getBracketsOrders(
  format: SetTournamentMatchupsDto["format"],
  winnerBrackets: TournamentMatchup[][],
  loserBrackets: TournamentMatchup[][],
) {
  return format === "linear"
    ? getLinearBracketsOrders(winnerBrackets, loserBrackets)
    : getAlternatingBracketsOrders(winnerBrackets, loserBrackets);
}

function getLinearBracketsOrders(
  winnerBrackets: TournamentMatchup[][],
  loserBrackets: TournamentMatchup[][],
) {
  const winnerBracketsOrders: number[][] = [];
  const loserBracketsOrders: number[][] = [];
  let orderIdx = 1;
  for (let i = 0; i < winnerBrackets.length - 1; i++) {
    const orders: number[] = [];
    for (let j = 0; j < winnerBrackets[i].length; j++) {
      orders.push(orderIdx);
      orderIdx++;
    }

    winnerBracketsOrders.push(orders);
  }

  for (let i = 0; i < loserBrackets.length; i++) {
    const orders: number[] = [];
    for (let j = 0; j < loserBrackets[i].length; j++) {
      orders.push(orderIdx);
      orderIdx++;
    }

    loserBracketsOrders.push(orders);
  }

  winnerBracketsOrders.push([orderIdx]);
  return {
    winnerBracketsOrders,
    loserBracketsOrders,
  };
}

function getAlternatingBracketsOrders(
  winnerBrackets: TournamentMatchup[][],
  loserBrackets: TournamentMatchup[][],
) {
  const winnerBracketsOrders: number[][] = [];
  const loserBracketsOrders: number[][] = [];
  let orderIdx = 1;
  let losersBracketIdx = 0;
  for (let i = 0; i < winnerBrackets.length - 1; i++) {
    const winnersBracket = winnerBrackets[i];
    const winnersBracketOrders = [];
    for (let j = 0; j < winnersBracket.length; j++) {
      winnersBracketOrders.push(orderIdx);
      orderIdx++;
    }

    winnerBracketsOrders.push(winnersBracketOrders);
    if (i > 0) {
      while (losersBracketIdx <= 2 * i - 1) {
        const losersBracketOrders = [];
        const losersBracket = loserBrackets[losersBracketIdx];
        for (let j = 0; j < losersBracket.length; j++) {
          losersBracketOrders.push(orderIdx);
          orderIdx++;
        }

        losersBracketIdx++;
        loserBracketsOrders.push(losersBracketOrders);
      }
    } else {
      const losersBracketOrders = [];
      const losersBracket = loserBrackets[0];
      for (let j = 0; j < losersBracket.length; j++) {
        losersBracketOrders.push(orderIdx);
        orderIdx++;
      }

      losersBracketIdx++;
      loserBracketsOrders.push(losersBracketOrders);
    }
  }

  winnerBracketsOrders.push([orderIdx]);
  return {
    winnerBracketsOrders,
    loserBracketsOrders,
  };
}

function getBracketsCounts(setMatchups: SetTournamentMatchupsDto) {
  const matchupsLength = setMatchups.matchups.length;
  return {
    winnerBracketCount: Math.log2(matchupsLength) + 2,
    loserBracketCount: 2 * Math.log2(matchupsLength),
    winnerMatchupCount: matchupsLength,
    loserMatchupCount: Math.ceil(matchupsLength / 2),
  };
}

async function addWinnerParticipantToNextMatchupAsync(
  matchup: Loaded<TournamentMatchup, "winnerNextMatchup">,
  winner: Ref<TournamentParticipant>,
) {
  const winnerNextMatchup = matchup.winnerNextMatchup!.$;
  if (matchup.winnerNextMatchupParticipantIndex === 0) {
    winnerNextMatchup.participant1 = winner;
  } else {
    winnerNextMatchup.participant2 = winner;
  }
}

async function addLoserParticipantToNextMatchupAsync(
  matchup: Loaded<TournamentMatchup, "loserNextMatchup">,
  loser: Ref<TournamentParticipant>,
) {
  const loserNextMatchup = matchup.loserNextMatchup!.$;
  if (matchup.loserNextMatchupParticipantIndex === 0) {
    loserNextMatchup.participant1 = loser;
  } else {
    loserNextMatchup.participant2 = loser;
  }
}

async function switchMatchupParticipantsAsync(
  matchups: Map<number, Loaded<TournamentMatchup, "winnerNextMatchup">>,
  matchup: Loaded<TournamentMatchup, "winnerNextMatchup">,
  participant1: Ref<TournamentParticipant>,
  participant2: Ref<TournamentParticipant>,
) {
  let current = matchup;
  while (current.winnerNextMatchup) {
    const nextIndex = current.winnerNextMatchupParticipantIndex!;
    const next = matchups.get(current.winnerNextMatchup.id)!;
    const nextParticipants = [next.participant1, next.participant2];
    if (nextParticipants[nextIndex]?.id === participant1.id) {
      if (nextIndex === 0) {
        next.participant1 = participant2;
      } else {
        next.participant2 = participant2;
      }
    }

    if (nextParticipants[1 - nextIndex]?.id === participant2.id) {
      if (nextIndex === 0) {
        next.participant2 = participant1;
      } else {
        next.participant1 = participant1;
      }
    }

    current = next;
  }
}

function getWinnerNextMatchupParticipantIndex(matchup: TournamentMatchup) {
  if (
    matchup.type === TournamentMatchupType.WINNER ||
    (matchup.bracketIndex % 2 === 1 &&
      matchup.winnerNextMatchup?.getEntity().type !== TournamentMatchupType.WINNER)
  ) {
    return matchup.matchupIndex % 2 === 0 ? 0 : 1;
  }

  return 1;
}

function getLoserNextMatchupParticipantIndex(matchup: TournamentMatchup) {
  if (matchup.bracketIndex === 0) {
    return matchup.matchupIndex % 2 === 0 ? 0 : 1;
  }

  return 0;
}
