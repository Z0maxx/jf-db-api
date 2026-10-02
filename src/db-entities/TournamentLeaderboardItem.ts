import { BaseEntity, type Ref, defineEntity, p } from '@mikro-orm/core';
import { TournamentMap } from './TournamentMap';
import { TournamentParticipant } from './TournamentParticipant';

export class TournamentLeaderboardItem extends BaseEntity {
  id!: number;
  prTimestamp!: Date;
  prSeconds!: number;
  stage!: number;
  participant!: Ref<TournamentParticipant>;
  map!: Ref<TournamentMap>;
}

export const TournamentLeaderboardItemSchema = defineEntity({
  class: TournamentLeaderboardItem,
  tableName: 'tournament_leaderboard',
  uniques: [
    { name: 'unq_tournament_leaderboard', properties: ['map', 'participant'] },
  ],
  checks: [
    { name: 'chk_tournament_leaderboard_stage', expression: '`stage` > 1' },
  ],
  properties: {
    id: p.integer().primary(),
    prTimestamp: p.datetime(),
    prSeconds: p.float().columnType('float unsigned').unsigned(),
    stage: p.integer().unsigned(),
    participant: () => p.manyToOne(TournamentParticipant).ref().updateRule('restrict').deleteRule('cascade').index('fk_tournament_leaderboard_participant_id'),
    map: () => p.manyToOne(TournamentMap).ref().updateRule('restrict').deleteRule('cascade').index('idx_tournament_leaderboard'),
  },
});
