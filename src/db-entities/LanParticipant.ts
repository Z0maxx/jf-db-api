import { BaseEntity, type Opt, type Ref, defineEntity, p } from '@mikro-orm/core';
import { LanEvent } from './LanEvent';
import { User } from './User';

export class LanParticipant extends BaseEntity {
  id!: number;
  alias!: string;
  disqualified: boolean & Opt = false;
  user!: Ref<User>;
  event!: Ref<LanEvent>;
}

export const LanParticipantSchema = defineEntity({
  class: LanParticipant,
  uniques: [{ name: 'unq_lan_participant', properties: ['event', 'user'] }],
  properties: {
    id: p.integer().primary(),
    alias: p.string().length(30),
    disqualified: p.boolean(),
    user: () => p.manyToOne(User).ref().updateRule('restrict').deleteRule('restrict').index('fk_lan_participant'),
    event: () => p.manyToOne(LanEvent).ref().updateRule('restrict').deleteRule('cascade'),
  },
});
