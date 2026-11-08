import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";

import { TournamentEvent } from "./TournamentEvent";
import { TournamentParticipant } from "./TournamentParticipant";

export class TournamentMatchup extends BaseEntity {
  id!: number;
  type!: TTournamentMatchupType;
  bracketIndex!: number;
  matchupIndex!: number;
  orderIndex!: number;
  winnerIndex?: number = NaN;
  participant1?: Ref<TournamentParticipant>;
  participant2?: Ref<TournamentParticipant>;
  winnerNextMatchup?: Ref<TournamentMatchup>;
  loserNextMatchup?: Ref<TournamentMatchup>;
  event!: Ref<TournamentEvent>;
}

export const TournamentMatchupType = {
  WINNER: "winner",
  LOSER: "loser",
} as const;

export type TTournamentMatchupType =
  (typeof TournamentMatchupType)[keyof typeof TournamentMatchupType];

export const TournamentMatchupSchema = defineEntity({
  class: TournamentMatchup,
  uniques: [
    { name: "unq_tournament_matchup_1", properties: ["event", "orderIndex"] },
    {
      name: "unq_tournament_matchup_2",
      properties: ["event", "bracketIndex", "matchupIndex", "type"],
    },
  ],
  checks: [
    {
      name: "chk_tournament_matchup_winner_index",
      expression: "`winner_index` <= 1",
    },
  ],
  properties: {
    id: p.integer().primary(),
    type: p.enum(() => TournamentMatchupType),
    bracketIndex: p.integer().unsigned(),
    matchupIndex: p.integer().unsigned(),
    orderIndex: p.integer().unsigned(),
    winnerIndex: p.integer().unsigned().nullable().defaultRaw(`NULL`),
    participant1: () =>
      p
        .manyToOne(TournamentParticipant)
        .ref()
        .name("participant_1_id")
        .updateRule("restrict")
        .deleteRule("cascade")
        .nullable()
        .defaultRaw(`NULL`)
        .index("fk_tournament_matchup_participant_1_id"),
    participant2: () =>
      p
        .manyToOne(TournamentParticipant)
        .ref()
        .name("participant_2_id")
        .updateRule("restrict")
        .deleteRule("cascade")
        .nullable()
        .defaultRaw(`NULL`)
        .index("fk_tournament_matchup_participant_2_id"),
    winnerNextMatchup: () =>
      p
        .manyToOne(TournamentMatchup)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .nullable()
        .defaultRaw(`NULL`)
        .index("fk_tournament_matchup_winner_next_matchup_id"),
    loserNextMatchup: () =>
      p
        .manyToOne(TournamentMatchup)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .nullable()
        .defaultRaw(`NULL`)
        .index("fk_tournament_matchup_loser_next_matchup_id"),
    event: () =>
      p
        .manyToOne(TournamentEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_tournament_matchup"),
  },
});
