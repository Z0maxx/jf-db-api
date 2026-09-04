import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutStage1Map } from "./AllOutStage1Map";

export class AllOutStage1LeaderboardItem extends BaseEntity {
  id!: number;
  steamId64!: string;
  prTimestamp!: Date;
  prSeconds!: number;
  map!: Ref<AllOutStage1Map>;
}

export const AllOutStage1LeaderboardItemSchema = defineEntity({
  class: AllOutStage1LeaderboardItem,
  tableName: "all_out_stage_1_leaderboard",
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
    prTimestamp: p.datetime(),
    prSeconds: p.float().columnType("float unsigned").unsigned(),
    map: () =>
      p
        .manyToOne(AllOutStage1Map)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_all_out_stage_1_leaderboard"),
  },
});
