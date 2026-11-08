import { BaseEntity, Collection, type Opt, defineEntity, p } from "@mikro-orm/core";

import { TournamentMap } from "./TournamentMap";
import { TournamentMatchup } from "./TournamentMatchup";
import { TournamentParticipant } from "./TournamentParticipant";

export class TournamentEvent extends BaseEntity {
  id!: number;
  canceled: boolean & Opt = false;
  type!: TTournamentEventType;
  description!: string;
  start!: Date;
  end?: Date;
  tournamentMapCollection = new Collection<TournamentMap>(this);
  tournamentMatchupCollection = new Collection<TournamentMatchup>(this);
  tournamentParticipantCollection = new Collection<TournamentParticipant>(this);
}

export const TournamentEventType = {
  SOLDIER: "soldier",
  DEMOMAN: "demoman",
} as const;

export type TTournamentEventType = (typeof TournamentEventType)[keyof typeof TournamentEventType];

export const TournamentEventSchema = defineEntity({
  class: TournamentEvent,
  properties: {
    id: p.integer().primary(),
    canceled: p.boolean(),
    type: p.enum(() => TournamentEventType),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime().nullable().defaultRaw(`NULL`),
    tournamentMapCollection: () => p.oneToMany(TournamentMap).mappedBy("event"),
    tournamentMatchupCollection: () => p.oneToMany(TournamentMatchup).mappedBy("event"),
    tournamentParticipantCollection: () => p.oneToMany(TournamentParticipant).mappedBy("event"),
  },
});
