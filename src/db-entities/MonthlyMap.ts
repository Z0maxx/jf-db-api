import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";
import { MonthlyEvent } from "./MonthlyEvent";
import { MonthlyLeaderboardItem } from "./MonthlyLeaderboardItem";

export class MonthlyMap extends BaseEntity {
  id!: number;
  name!: string;
  event!: Ref<MonthlyEvent>;
  monthlyLeaderboardItemCollection = new Collection<MonthlyLeaderboardItem>(this);
}

export const MonthlyMapSchema = defineEntity({
  class: MonthlyMap,
  checks: [{ name: "name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(50),
    event: () =>
      p
        .manyToOne(MonthlyEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_monthly_map"),
    monthlyLeaderboardItemCollection: () => p.oneToMany(MonthlyLeaderboardItem).mappedBy("map"),
  },
});
