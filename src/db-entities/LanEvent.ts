import { BaseEntity, Collection, type Opt, defineEntity, p } from "@mikro-orm/core";

import { LanMap } from "./LanMap";
import { LanParticipant } from "./LanParticipant";

export class LanEvent extends BaseEntity {
  id!: number;
  posterUrl!: string;
  trailerUrl!: string;
  name!: string;
  canceled: boolean & Opt = false;
  description!: string;
  start!: Date;
  end?: Date;
  lanMapCollection = new Collection<LanMap>(this);
  lanParticipantCollection = new Collection<LanParticipant>(this);
}

export const LanEventSchema = defineEntity({
  class: LanEvent,
  checks: [
    {
      name: "chk_lan_event_description",
      expression: "char_length(`description`) > 0",
    },
    { name: "chk_lan_event_name", expression: "char_length(`name`) > 0" },
  ],
  properties: {
    id: p.integer().primary(),
    posterUrl: p.string().length(200),
    trailerUrl: p.string().length(200),
    name: p.string().length(100),
    canceled: p.boolean(),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime().nullable().defaultRaw(`NULL`),
    lanMapCollection: () => p.oneToMany(LanMap).mappedBy("event"),
    lanParticipantCollection: () => p.oneToMany(LanParticipant).mappedBy("event"),
  },
});
