import { BaseEntity, Collection, type Opt, defineEntity, p } from '@mikro-orm/core';
import { Claim } from './Claim';
import { User } from './User';

export class Role extends BaseEntity {
  id!: number;
  level: number & Opt = 9999;
  name!: string;
  claimCollection = new Collection<Claim>(this);
  userCollection = new Collection<User>(this);
}

export const RoleSchema = defineEntity({
  class: Role,
  checks: [{ name: 'chk_role_name', expression: 'char_length(`name`) > 0' }],
  properties: {
    id: p.integer().primary(),
    level: p.integer().unsigned(),
    name: p.string().length(20).unique('unq_role'),
    claimCollection: () => p.manyToMany(Claim).pivotTable('role_claim').joinColumn('role_id').inverseJoinColumn('claim_id'),
    userCollection: () => p.oneToMany(User).mappedBy('role'),
  },
});
