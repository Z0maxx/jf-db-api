import { BaseEntity, Collection, defineEntity, p } from '@mikro-orm/core';
import { BountyPrize } from './BountyPrize';

export class BountyEvent extends BaseEntity {
  id!: number;
  description!: string;
  start!: Date;
  end!: Date;
  bountyPrizeCollection = new Collection<BountyPrize>(this);
}

export const BountyEventSchema = defineEntity({
  class: BountyEvent,
  properties: {
    id: p.integer().primary(),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime(),
    bountyPrizeCollection: () => p.oneToMany(BountyPrize).mappedBy('event'),
  },
});
