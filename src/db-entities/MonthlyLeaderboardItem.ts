import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";

import { MonthlyLeaderboardSubmission } from "./MonthlyLeaderboardSubmission";
import { MonthlyMap } from "./MonthlyMap";
import { MonthlyParticipant } from "./MonthlyParticipant";

export class MonthlyLeaderboardItem extends BaseEntity {
  id!: number;
  prTimestamp!: Date;
  prSeconds!: number;
  verified!: boolean;
  participant!: Ref<MonthlyParticipant>;
  map!: Ref<MonthlyMap>;
  monthlyLeaderboardSubmissionCollection = new Collection<MonthlyLeaderboardSubmission>(this);
}

export const MonthlyLeaderboardItemSchema = defineEntity({
  class: MonthlyLeaderboardItem,
  tableName: "monthly_leaderboard",
  uniques: [{ name: "unq_monthly_leaderboard", properties: ["map", "participant"] }],
  properties: {
    id: p.integer().primary(),
    prTimestamp: p.datetime(),
    prSeconds: p.float().columnType("float unsigned").unsigned(),
    verified: p.boolean(),
    participant: () =>
      p
        .manyToOne(MonthlyParticipant)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("fk_monthly_leaderboard_participant_id"),
    map: () =>
      p
        .manyToOne(MonthlyMap)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_monthly_leaderboard"),
    monthlyLeaderboardSubmissionCollection: () =>
      p.oneToMany(MonthlyLeaderboardSubmission).mappedBy("leaderboardItem"),
  },
});
