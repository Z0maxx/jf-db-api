import { BaseEntity, Collection, type Opt, defineEntity, p } from "@mikro-orm/core";

import { MonthlyLeaderboardSubmission } from "./MonthlyLeaderboardSubmission";
import { MonthlyMap } from "./MonthlyMap";
import { MonthlyParticipant } from "./MonthlyParticipant";

export class MonthlyEvent extends BaseEntity {
  id!: number;
  type!: TMonthlyEventType;
  canceled: boolean & Opt = false;
  description!: string;
  start!: Date;
  end!: Date;
  monthlyLeaderboardSubmissionCollection = new Collection<MonthlyLeaderboardSubmission>(this);
  monthlyMapCollection = new Collection<MonthlyMap>(this);
  monthlyParticipantCollection = new Collection<MonthlyParticipant>(this);
}

export const MonthlyEventType = {
  SOLDIER: "soldier",
  DEMOMAN: "demoman",
} as const;

export type TMonthlyEventType = (typeof MonthlyEventType)[keyof typeof MonthlyEventType];

export const MonthlyEventSchema = defineEntity({
  class: MonthlyEvent,
  properties: {
    id: p.integer().primary(),
    type: p.enum(() => MonthlyEventType),
    canceled: p.boolean(),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime(),
    monthlyLeaderboardSubmissionCollection: () =>
      p.oneToMany(MonthlyLeaderboardSubmission).mappedBy("event"),
    monthlyMapCollection: () => p.oneToMany(MonthlyMap).mappedBy("event"),
    monthlyParticipantCollection: () => p.oneToMany(MonthlyParticipant).mappedBy("event"),
  },
});
