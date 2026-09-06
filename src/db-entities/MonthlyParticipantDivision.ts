import { BaseEntity, type Ref, defineEntity, p } from '@mikro-orm/core';
import { Division } from './Division';
import { MonthlyParticipant } from './MonthlyParticipant';

export class MonthlyParticipantDivision extends BaseEntity {
  id!: number;
  participant!: Ref<MonthlyParticipant>;
  division!: Ref<Division>;
}

export const MonthlyParticipantDivisionSchema = defineEntity({
  class: MonthlyParticipantDivision,
  properties: {
    id: p.integer().primary(),
    participant: () => p.manyToOne(MonthlyParticipant).ref().updateRule('restrict').index('idx_monthly_participant_division'),
    division: () => p.manyToOne(Division).ref().updateRule('restrict').deleteRule('restrict').index('fk_monthly_participant_division_division_id'),
  },
});
