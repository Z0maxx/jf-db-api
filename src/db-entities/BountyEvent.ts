import { BaseEntity, Collection, type Opt, defineEntity, p } from "@mikro-orm/core";
import { BountyPrize } from "./BountyPrize";

export class BountyEvent extends BaseEntity {
  id!: number;
  canceled: boolean & Opt = false;
  description!: string;
  start!: Date;
  end!: Date;
  bountyPrizeCollection = new Collection<BountyPrize>(this);
}

export const BountyEventSchema = defineEntity({
  class: BountyEvent,
  properties: {
    id: p.integer().primary(),
    canceled: p.boolean(),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime(),
    bountyPrizeCollection: () => p.oneToMany(BountyPrize).mappedBy("event"),
  },
});
