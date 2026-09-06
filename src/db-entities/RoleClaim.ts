import { BaseEntity, type Ref, defineEntity, p } from '@mikro-orm/core';
import { Claim } from './Claim';
import { Role } from './Role';

export class RoleClaim extends BaseEntity {
  id!: number;
  role!: Ref<Role>;
  claim!: Ref<Claim>;
}

export const RoleClaimSchema = defineEntity({
  class: RoleClaim,
  uniques: [{ name: 'unq_role_claim', properties: ['role', 'claim'] }],
  properties: {
    id: p.integer().primary(),
    role: () => p.manyToOne(Role).ref().updateRule('restrict').index('idx_role_claim'),
    claim: () => p.manyToOne(Claim).ref().updateRule('restrict').index('fk_claim_role_claim_id'),
  },
});
