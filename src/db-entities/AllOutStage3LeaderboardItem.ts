import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutStage3Map } from "./AllOutStage3Map";

export class AllOutStage3LeaderboardItem extends BaseEntity {
  id!: number;
  steamId64!: string;
  prTimestamp!: Date;
  prSeconds!: number;
  map!: Ref<AllOutStage3Map>;
}

export const AllOutStage3LeaderboardItemSchema = defineEntity({
  class: AllOutStage3LeaderboardItem,
  tableName: "all_out_stage_3_leaderboard",
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
        .manyToOne(AllOutStage3Map)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_all_out_stage_3_leaderboard"),
  },
});
