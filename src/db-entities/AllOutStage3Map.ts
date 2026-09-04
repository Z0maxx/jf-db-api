import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";
import { AllOutEvent } from "./AllOutEvent";
import { AllOutStage3LeaderboardItem } from "./AllOutStage3LeaderboardItem";

export class AllOutStage3Map extends BaseEntity {
  id!: number;
  name!: string;
  event!: Ref<AllOutEvent>;
  allOutStage3LeaderboardItemCollection = new Collection<AllOutStage3LeaderboardItem>(this);
}

export const AllOutStage3MapSchema = defineEntity({
  class: AllOutStage3Map,
  tableName: "all_out_stage_3_map",
  checks: [{ name: "name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(50),
    event: () =>
      p
        .manyToOne(AllOutEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_all_out_stage_3_map"),
    allOutStage3LeaderboardItemCollection: () =>
      p.oneToMany(AllOutStage3LeaderboardItem).mappedBy("map"),
  },
});
