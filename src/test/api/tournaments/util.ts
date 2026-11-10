import { Loaded, Reference } from "@mikro-orm/core";

import { TournamentMatchup, TournamentMatchupType } from "#/db-entities/TournamentMatchup";
import { TournamentParticipant } from "#/db-entities/TournamentParticipant";

export function assortMatchups<T extends TournamentMatchup>(matchups: T[]) {
  return {
    winnerMatchups: matchups
      .filter((m) => m.type === TournamentMatchupType.WINNER)
      .sort(sortByBracketAndOrderIndex),
    loserMatchups: matchups
      .filter((m) => m.type === TournamentMatchupType.LOSER)
      .sort(sortByBracketAndOrderIndex),
  };
}

export function sortByBracketAndOrderIndex(a: TournamentMatchup, b: TournamentMatchup) {
  return a.bracketIndex - b.bracketIndex || a.orderIndex - b.orderIndex;
}

export function setMatchupParticipantsFromList({
  winnerMatchups,
  loserMatchups,
  winnerParticipants,
  loserParticipants,
}: {
  winnerMatchups: TournamentMatchup[];
  loserMatchups: TournamentMatchup[];
  winnerParticipants?: (TournamentParticipant | null)[][][];
  loserParticipants?: (TournamentParticipant | null)[][][];
}) {
  if (winnerParticipants) {
    const winnerMatchupsByBracket = Object.groupBy(winnerMatchups, (m) => m.bracketIndex);
    Object.entries(winnerMatchupsByBracket)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([bracketIndex, matchups]) => {
        const sortedMatchups = matchups!.toSorted((a, b) => a.matchupIndex - b.matchupIndex);
        sortedMatchups.forEach((m) => {
          const participants = winnerParticipants[parseInt(bracketIndex)][m.matchupIndex];
          m.participant1 = participants[0] ? Reference.create(participants[0]) : null!;
          m.participant2 = participants[1] ? Reference.create(participants[1]) : null!;
        });
      });
  }

  if (loserParticipants) {
    const loserMatchupsByBracket = Object.groupBy(loserMatchups, (m) => m.bracketIndex);
    Object.entries(loserMatchupsByBracket)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([bracketIndex, matchups]) => {
        const sortedMatchups = matchups!.toSorted((a, b) => a.matchupIndex - b.matchupIndex);
        sortedMatchups.forEach((m) => {
          const participants = loserParticipants[parseInt(bracketIndex)][m.matchupIndex];
          m.participant1 = participants[0] ? Reference.create(participants[0]) : null!;
          m.participant2 = participants[1] ? Reference.create(participants[1]) : null!;
        });
      });
  }
}

export function getMatchupParticipantAliasesAsList({
  winnerMatchups,
  loserMatchups,
}: {
  winnerMatchups: Loaded<TournamentMatchup, "participant1" | "participant2">[];
  loserMatchups: Loaded<TournamentMatchup, "participant1" | "participant2">[];
}) {
  const winnerParticipants: (string | null)[][][] = [];
  const loserParticipants: (string | null)[][][] = [];
  const winnerMatchupsByBracket = Object.groupBy(winnerMatchups, (m) => m.bracketIndex);
  const loserMatchupsByBracket = Object.groupBy(loserMatchups, (m) => m.bracketIndex);
  Object.entries(winnerMatchupsByBracket)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .forEach(([_, matchups]) => {
      const bracket: (string | null)[][] = [];
      const sortedMatchups = matchups!.toSorted((a, b) => a.matchupIndex - b.matchupIndex);
      sortedMatchups.forEach((m) => {
        bracket.push([m.participant1?.$.alias ?? null, m.participant2?.$.alias ?? null]);
      });

      winnerParticipants.push(bracket);
    });

  Object.entries(loserMatchupsByBracket)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .forEach(([_, matchups]) => {
      const bracket: (string | null)[][] = [];
      const sortedMatchups = matchups!.toSorted((a, b) => a.matchupIndex - b.matchupIndex);
      sortedMatchups.forEach((m) => {
        bracket.push([m.participant1?.$.alias ?? null, m.participant2?.$.alias ?? null]);
      });

      loserParticipants.push(bracket);
    });

  return {
    winnerParticipants,
    loserParticipants,
  };
}
