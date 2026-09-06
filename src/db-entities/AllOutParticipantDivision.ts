import { BaseEntity, type Ref, defineEntity, p } from '@mikro-orm/core';
import { AllOutParticipant } from './AllOutParticipant';
import { Division } from './Division';

export class AllOutParticipantDivision extends BaseEntity {
  id!: number;
  participant!: Ref<AllOutParticipant>;
  division!: Ref<Division>;
}

export const AllOutParticipantDivisionSchema = defineEntity({
  class: AllOutParticipantDivision,
  uniques: [
    {
      name: 'unq_al_out_particpant_division',
      properties: ['participant', 'division'],
    },
  ],
  properties: {
    id: p.integer().primary(),
    participant: () => p.manyToOne(AllOutParticipant).ref().updateRule('restrict').index('idx_all_out_participant_division'),
    division: () => p.manyToOne(Division).ref().updateRule('restrict').deleteRule('restrict').index('fk_all_out_participant_division_division_id'),
  },
});
