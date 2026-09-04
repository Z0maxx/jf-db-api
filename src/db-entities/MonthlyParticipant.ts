import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { MonthlyEvent } from "./MonthlyEvent";

export class MonthlyParticipant extends BaseEntity {
  id!: number;
  steamId64!: string;
  event!: Ref<MonthlyEvent>;
}

export const MonthlyParticipantSchema = defineEntity({
  class: MonthlyParticipant,
  indexes: [{ name: "idx_monthly_participant_2", properties: ["event", "steamId64"] }],
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
        .manyToOne(MonthlyEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_monthly_participant_1"),
  },
});
