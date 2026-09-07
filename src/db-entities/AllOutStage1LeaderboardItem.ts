import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutParticipant } from "./AllOutParticipant";
import { AllOutStage1Map } from "./AllOutStage1Map";

export class AllOutStage1LeaderboardItem extends BaseEntity {
  id!: number;
  prTimestamp!: Date;
  prSeconds!: number;
  participant!: Ref<AllOutParticipant>;
  map!: Ref<AllOutStage1Map>;
}

export const AllOutStage1LeaderboardItemSchema = defineEntity({
  class: AllOutStage1LeaderboardItem,
  tableName: "all_out_stage_1_leaderboard",
  uniques: [
    {
      name: "unq_all_out_stage_1_leaderboard",
      properties: ["map", "participant"],
    },
  ],
  properties: {
    id: p.integer().primary(),
    prTimestamp: p.datetime(),
    prSeconds: p.float().columnType("float unsigned").unsigned(),
    participant: () =>
      p
        .manyToOne(AllOutParticipant)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("fk_all_out_stage_1_leaderboard_participant_id"),
    map: () =>
      p
        .manyToOne(AllOutStage1Map)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_all_out_stage_1_leaderboard"),
  },
});
