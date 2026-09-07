import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutParticipant } from "./AllOutParticipant";
import { AllOutStage2Map } from "./AllOutStage2Map";

export class AllOutStage2LeaderboardItem extends BaseEntity {
  id!: number;
  prTimestamp!: Date;
  prSeconds!: number;
  lapCount!: number;
  lastLapTimestamp!: Date;
  participant!: Ref<AllOutParticipant>;
  map!: Ref<AllOutStage2Map>;
}

export const AllOutStage2LeaderboardItemSchema = defineEntity({
  class: AllOutStage2LeaderboardItem,
  tableName: "all_out_stage_2_leaderboard",
  uniques: [
    {
      name: "unq_all_out_stage_2_leaderboard",
      properties: ["map", "participant"],
    },
  ],
  properties: {
    id: p.integer().primary(),
    prTimestamp: p.datetime(),
    prSeconds: p.float().columnType("float unsigned").unsigned(),
    lapCount: p.integer().unsigned(),
    lastLapTimestamp: p.datetime(),
    participant: () =>
      p
        .manyToOne(AllOutParticipant)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("fk_all_out_stage_2_leaderboard_participant_id"),
    map: () =>
      p
        .manyToOne(AllOutStage2Map)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_all_out_stage_2_leaderboard"),
  },
});
