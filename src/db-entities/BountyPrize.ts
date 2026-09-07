import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";
import { BountyEvent } from "./BountyEvent";
import { BountyMap } from "./BountyMap";
import { Division } from "./Division";

export class BountyPrize extends BaseEntity {
  id!: number;
  keyPrize!: number;
  division!: Ref<Division>;
  event!: Ref<BountyEvent>;
  bountyMapCollection = new Collection<BountyMap>(this);
}

export const BountyPrizeSchema = defineEntity({
  class: BountyPrize,
  properties: {
    id: p.integer().primary(),
    keyPrize: p.integer().unsigned(),
    division: () =>
      p
        .manyToOne(Division)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("fk_bounty_prize_division_id"),
    event: () =>
      p
        .manyToOne(BountyEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_bounty_prize"),
    bountyMapCollection: () => p.oneToMany(BountyMap).mappedBy("prize"),
  },
});
