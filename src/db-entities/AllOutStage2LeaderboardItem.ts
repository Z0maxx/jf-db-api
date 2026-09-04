import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutStage2Map } from "./AllOutStage2Map";

export class AllOutStage2LeaderboardItem extends BaseEntity {
  id!: number;
  steamId64!: string;
  prTimestamp!: Date;
  prSeconds!: number;
  lapCount!: number;
  lastLapTimestamp!: Date;
  map!: Ref<AllOutStage2Map>;
}

export const AllOutStage2LeaderboardItemSchema = defineEntity({
  class: AllOutStage2LeaderboardItem,
  tableName: "all_out_stage_2_leaderboard",
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
    lapCount: p.integer().unsigned(),
    lastLapTimestamp: p.datetime(),
    map: () =>
      p
        .manyToOne(AllOutStage2Map)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_all_out_stage_2_leaderboard"),
  },
});
