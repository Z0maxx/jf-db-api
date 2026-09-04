import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { TournamentMap } from "./TournamentMap";

export class TournamentLeaderboardItem extends BaseEntity {
  id!: number;
  steamId64!: string;
  prTimestamp!: Date;
  prSeconds!: number;
  stage!: number;
  map!: Ref<TournamentMap>;
}

export const TournamentLeaderboardItemSchema = defineEntity({
  class: TournamentLeaderboardItem,
  tableName: "tournament_leaderboard",
  checks: [
    { name: "stage", expression: "`stage` > 1" },
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
    prTimestamp: p.datetime(),
    prSeconds: p.float().columnType("float unsigned").unsigned(),
    stage: p.integer().unsigned(),
    map: () =>
      p
        .manyToOne(TournamentMap)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_tournament_leaderboard"),
  },
});
