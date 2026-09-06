import { BaseEntity, Collection, type Ref, defineEntity, p } from '@mikro-orm/core';
import { TournamentEvent } from './TournamentEvent';
import { TournamentLeaderboardItem } from './TournamentLeaderboardItem';
import { User } from './User';

export class TournamentParticipant extends BaseEntity {
  id!: number;
  user!: Ref<User>;
  event!: Ref<TournamentEvent>;
  tournamentLeaderboardItemCollection = new Collection<TournamentLeaderboardItem>(this);
}

export const TournamentParticipantSchema = defineEntity({
  class: TournamentParticipant,
  indexes: [
    { name: 'idx_tournament_participant_3', properties: ['event', 'user'] },
  ],
  uniques: [{ name: 'unq_tournament_participant', properties: ['event', 'user'] }],
  properties: {
    id: p.integer().primary(),
    user: () => p.manyToOne(User).ref().updateRule('restrict').deleteRule('restrict').index('idx_tournament_participant_2'),
    event: () => p.manyToOne(TournamentEvent).ref().updateRule('restrict').index('idx_tournament_participant_1'),
    tournamentLeaderboardItemCollection: () => p.oneToMany(TournamentLeaderboardItem).mappedBy('participant'),
  },
});
