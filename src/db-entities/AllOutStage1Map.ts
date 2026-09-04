import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutEvent } from "./AllOutEvent";
import { AllOutStage1LeaderboardItem } from "./AllOutStage1LeaderboardItem";

export class AllOutStage1Map extends BaseEntity {
  id!: number;
  name!: string;
  timeLimit!: number;
  event!: Ref<AllOutEvent>;
  allOutStage1LeaderboardItemCollection = new Collection<AllOutStage1LeaderboardItem>(this);
}

export const AllOutStage1MapSchema = defineEntity({
  class: AllOutStage1Map,
  tableName: "all_out_stage_1_map",
  checks: [{ name: "name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(50),
    timeLimit: p.integer().unsigned(),
    event: () =>
      p
        .manyToOne(AllOutEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_all_out_stage_1_map"),
    allOutStage1LeaderboardItemCollection: () =>
      p.oneToMany(AllOutStage1LeaderboardItem).mappedBy("map"),
  },
});
