import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";

import { MonthlyEvent } from "./MonthlyEvent";
import { MonthlyLeaderboardItem } from "./MonthlyLeaderboardItem";

export class MonthlyLeaderboardSubmission extends BaseEntity {
  id!: number;
  submissionTimestamp!: Date;
  tempusServerId!: number;
  leaderboardItem!: Ref<MonthlyLeaderboardItem>;
  event!: Ref<MonthlyEvent>;
}

export const MonthlyLeaderboardSubmissionSchema = defineEntity({
  class: MonthlyLeaderboardSubmission,
  uniques: [
    {
      name: "unq_monthly_leaderboard_submissions",
      properties: ["event", "leaderboardItem"],
    },
  ],
  properties: {
    id: p.integer().primary(),
    submissionTimestamp: p.datetime(),
    tempusServerId: p.integer().unsigned(),
    leaderboardItem: () =>
      p
        .manyToOne(MonthlyLeaderboardItem)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("fk_monthly_leaderboard_submissions_leaderboard_item_id"),
    event: () => p.manyToOne(MonthlyEvent).ref().updateRule("restrict").deleteRule("cascade"),
  },
});
