import { BaseEntity, Collection, type Opt, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutEvent } from "./AllOutEvent";
import { AllOutParticipantDivision } from "./AllOutParticipantDivision";
import { AllOutStage1LeaderboardItem } from "./AllOutStage1LeaderboardItem";
import { AllOutStage2LeaderboardItem } from "./AllOutStage2LeaderboardItem";
import { AllOutStage3LeaderboardItem } from "./AllOutStage3LeaderboardItem";
import { User } from "./User";

export class AllOutParticipant extends BaseEntity {
  id!: number;
  resigned: boolean & Opt = false;
  user!: Ref<User>;
  event!: Ref<AllOutEvent>;
  allOutParticipantDivisionCollection = new Collection<AllOutParticipantDivision>(this);
  allOutStage1LeaderboardItemCollection = new Collection<AllOutStage1LeaderboardItem>(this);
  allOutStage2LeaderboardItemCollection = new Collection<AllOutStage2LeaderboardItem>(this);
  allOutStage3LeaderboardItemCollection = new Collection<AllOutStage3LeaderboardItem>(this);
}

export const AllOutParticipantSchema = defineEntity({
  class: AllOutParticipant,
  indexes: [{ name: "idx_all_out_participant_3", properties: ["event", "user"] }],
  uniques: [{ name: "unq_all_out_participant", properties: ["event", "user"] }],
  properties: {
    id: p.integer().primary(),
    resigned: p.boolean(),
    user: () =>
      p
        .manyToOne(User)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_all_out_participant_2"),
    event: () =>
      p
        .manyToOne(AllOutEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_all_out_participant_1"),
    allOutParticipantDivisionCollection: () =>
      p.oneToMany(AllOutParticipantDivision).mappedBy("participant"),
    allOutStage1LeaderboardItemCollection: () =>
      p.oneToMany(AllOutStage1LeaderboardItem).mappedBy("participant"),
    allOutStage2LeaderboardItemCollection: () =>
      p.oneToMany(AllOutStage2LeaderboardItem).mappedBy("participant"),
    allOutStage3LeaderboardItemCollection: () =>
      p.oneToMany(AllOutStage3LeaderboardItem).mappedBy("participant"),
  },
});
