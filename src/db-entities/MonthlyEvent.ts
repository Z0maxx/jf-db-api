import { BaseEntity, Collection, type Opt, defineEntity, p } from "@mikro-orm/core";

import { MonthlyMap } from "./MonthlyMap";
import { MonthlyParticipant } from "./MonthlyParticipant";

export class MonthlyEvent extends BaseEntity {
  id!: number;
  canceled: boolean & Opt = false;
  description!: string;
  start!: Date;
  end!: Date;
  monthlyMapCollection = new Collection<MonthlyMap>(this);
  monthlyParticipantCollection = new Collection<MonthlyParticipant>(this);
}

export const MonthlyEventSchema = defineEntity({
  class: MonthlyEvent,
  properties: {
    id: p.integer().primary(),
    canceled: p.boolean(),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime(),
    monthlyMapCollection: () => p.oneToMany(MonthlyMap).mappedBy("event"),
    monthlyParticipantCollection: () => p.oneToMany(MonthlyParticipant).mappedBy("event"),
  },
});
