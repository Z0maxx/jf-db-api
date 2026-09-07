import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutParticipant } from "./AllOutParticipant";
import { AllOutStage3Map } from "./AllOutStage3Map";

export class AllOutStage3LeaderboardItem extends BaseEntity {
  id!: number;
  prTimestamp!: Date;
  prSeconds!: number;
  participant!: Ref<AllOutParticipant>;
  map!: Ref<AllOutStage3Map>;
}

export const AllOutStage3LeaderboardItemSchema = defineEntity({
  class: AllOutStage3LeaderboardItem,
  tableName: "all_out_stage_3_leaderboard",
  uniques: [
    {
      name: "unq_all_out_stage_3_leaderboard",
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
        .index("fk_all_out_stage_3_leaderboard_participant_id"),
    map: () =>
      p
        .manyToOne(AllOutStage3Map)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_all_out_stage_3_leaderboard"),
  },
});
