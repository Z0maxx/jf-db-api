import { BaseEntity, Collection, type Opt, type Ref, defineEntity, p } from "@mikro-orm/core";
import { Division } from "./Division";
import { MonthlyEvent } from "./MonthlyEvent";
import { MonthlyLeaderboardItem } from "./MonthlyLeaderboardItem";
import { User } from "./User";

export class MonthlyParticipant extends BaseEntity {
  id!: number;
  user!: Ref<User>;
  event!: Ref<MonthlyEvent>;
  division!: Ref<Division>;
  resigned: boolean & Opt = false;
  divisionCollection = new Collection<Division>(this);
  monthlyLeaderboardItemCollection = new Collection<MonthlyLeaderboardItem>(this);
}

export const MonthlyParticipantSchema = defineEntity({
  class: MonthlyParticipant,
  indexes: [{ name: "idx_monthly_participant_3", properties: ["event", "user"] }],
  uniques: [{ name: "unq_monthly_participant", properties: ["event", "user"] }],
  properties: {
    id: p.integer().primary(),
    user: () =>
      p
        .manyToOne(User)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_monthly_participant_2"),
    event: () =>
      p
        .manyToOne(MonthlyEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_monthly_participant_1"),
    division: () =>
      p
        .manyToOne(Division)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("fk_monthly_participant_division_id"),
    resigned: p.boolean(),
    divisionCollection: () =>
      p
        .manyToMany(Division)
        .pivotTable("monthly_participant_division")
        .joinColumn("participant_id")
        .inverseJoinColumn("division_id"),
    monthlyLeaderboardItemCollection: () =>
      p.oneToMany(MonthlyLeaderboardItem).mappedBy("participant"),
  },
});
