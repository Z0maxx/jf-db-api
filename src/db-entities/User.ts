import { BaseEntity, Collection, type Ref, defineEntity, p } from '@mikro-orm/core';
import { AllOutParticipant } from './AllOutParticipant';
import { BountyCompletion } from './BountyCompletion';
import { MonthlyParticipant } from './MonthlyParticipant';
import { Role } from './Role';
import { TournamentParticipant } from './TournamentParticipant';
import { UserDivision } from './UserDivision';

export class User extends BaseEntity {
  id!: number;
  steamId64!: string;
  tempusId!: number;
  role!: Ref<Role>;
  allOutParticipantCollection = new Collection<AllOutParticipant>(this);
  bountyCompletionCollection = new Collection<BountyCompletion>(this);
  monthlyParticipantCollection = new Collection<MonthlyParticipant>(this);
  tournamentParticipantCollection = new Collection<TournamentParticipant>(this);
  userDivisionCollection = new Collection<UserDivision>(this);
}

export const UserSchema = defineEntity({
  class: User,
  uniques: [{ name: 'unq_user', properties: ['steamId64', 'tempusId'] }],
  checks: [
    {
      name: 'chk_user_steam_id_64',
      expression: 'char_length(`steam_id_64`) = 17',
    },
  ],
  properties: {
    id: p.integer().primary(),
    steamId64: p.string().name('steam_id_64').length(17).index('idx_user'),
    tempusId: p.integer().unsigned(),
    role: () => p.manyToOne(Role).ref().updateRule('restrict').deleteRule('restrict').index('fk_user_role_id'),
    allOutParticipantCollection: () => p.oneToMany(AllOutParticipant).mappedBy('user'),
    bountyCompletionCollection: () => p.oneToMany(BountyCompletion).mappedBy('user'),
    monthlyParticipantCollection: () => p.oneToMany(MonthlyParticipant).mappedBy('user'),
    tournamentParticipantCollection: () => p.oneToMany(TournamentParticipant).mappedBy('user'),
    userDivisionCollection: () => p.oneToMany(UserDivision).mappedBy('user'),
  },
});
