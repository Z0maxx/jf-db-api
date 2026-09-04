import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { TournamentEvent } from "./TournamentEvent";

export class TournamentParticipant extends BaseEntity {
  id!: number;
  steamId64!: string;
  event!: Ref<TournamentEvent>;
}

export const TournamentParticipantSchema = defineEntity({
  class: TournamentParticipant,
  indexes: [{ name: "idx_tournament_participant_2", properties: ["event", "steamId64"] }],
  checks: [
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
  ],
  properties: {
    id: p.integer().primary(),
    steamId64: p.string().name("steam_id_64").length(17),
    event: () =>
      p
        .manyToOne(TournamentEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_tournament_participant_1"),
  },
});
