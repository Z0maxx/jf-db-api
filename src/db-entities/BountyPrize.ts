import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";
import { BountyEvent } from "./BountyEvent";
import { BountyMap } from "./BountyMap";

export class BountyPrize extends BaseEntity {
  id!: number;
  division!: string;
  keyPrize!: number;
  event!: Ref<BountyEvent>;
  bountyMapCollection = new Collection<BountyMap>(this);
}

export const BountyPrizeSchema = defineEntity({
  class: BountyPrize,
  properties: {
    id: p.integer().primary(),
    division: p.string().length(50),
    keyPrize: p.integer().unsigned(),
    event: () =>
      p
        .manyToOne(BountyEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_bounty_prize"),
    bountyMapCollection: () => p.oneToMany(BountyMap).mappedBy("prize"),
  },
});
