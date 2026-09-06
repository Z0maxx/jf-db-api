import { BaseEntity, Collection, defineEntity, p } from '@mikro-orm/core';
import { TournamentMap } from './TournamentMap';
import { TournamentParticipant } from './TournamentParticipant';

export class TournamentEvent extends BaseEntity {
  id!: number;
  description!: string;
  start!: Date;
  end!: Date;
  tournamentMapCollection = new Collection<TournamentMap>(this);
  tournamentParticipantCollection = new Collection<TournamentParticipant>(this);
}

export const TournamentEventSchema = defineEntity({
  class: TournamentEvent,
  properties: {
    id: p.integer().primary(),
    description: p.text().length(65535),
    start: p.datetime(),
    end: p.datetime(),
    tournamentMapCollection: () => p.oneToMany(TournamentMap).mappedBy('event'),
    tournamentParticipantCollection: () => p.oneToMany(TournamentParticipant).mappedBy('event'),
  },
});
