import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { MonthlyMap } from "./MonthlyMap";

export class MonthlyLeaderboardItem extends BaseEntity {
  id!: number;
  steamId64!: string;
  prTimestamp!: Date;
  prSeconds!: number;
  map!: Ref<MonthlyMap>;
}

export const MonthlyLeaderboardItemSchema = defineEntity({
  class: MonthlyLeaderboardItem,
  tableName: "monthly_leaderboard",
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
        .manyToOne(MonthlyMap)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_monthly_leaderboard"),
  },
});
