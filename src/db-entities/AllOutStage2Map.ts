import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";

import { AllOutEvent } from "./AllOutEvent";
import { AllOutStage2LeaderboardItem } from "./AllOutStage2LeaderboardItem";
import { Division } from "./Division";

export class AllOutStage2Map extends BaseEntity {
  id!: number;
  name!: string;
  division!: Ref<Division>;
  event!: Ref<AllOutEvent>;
  allOutStage2LeaderboardItemCollection = new Collection<AllOutStage2LeaderboardItem>(this);
}

export const AllOutStage2MapSchema = defineEntity({
  class: AllOutStage2Map,
  tableName: "all_out_stage_2_map",
  checks: [
    {
      name: "chk_all_out_stage_2_map_name",
      expression: "char_length(`name`) > 0",
    },
  ],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(50),
    division: () =>
      p
        .manyToOne(Division)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("fk_all_out_stage_2_map_division_id"),
    event: () =>
      p
        .manyToOne(AllOutEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_all_out_stage_2_map"),
    allOutStage2LeaderboardItemCollection: () =>
      p.oneToMany(AllOutStage2LeaderboardItem).mappedBy("map"),
  },
});
