import { BaseEntity, Collection, defineEntity, p } from '@mikro-orm/core';
import { RoleClaim } from './RoleClaim';
import { User } from './User';

export class Role extends BaseEntity {
  id!: number;
  level!: number;
  name!: string;
  roleClaimCollection = new Collection<RoleClaim>(this);
  userCollection = new Collection<User>(this);
}

export const RoleSchema = defineEntity({
  class: Role,
  checks: [{ name: 'chk_role_name', expression: 'char_length(`name`) > 0' }],
  properties: {
    id: p.integer().primary(),
    level: p.integer().unsigned(),
    name: p.string().length(20).unique('unq_role'),
    roleClaimCollection: () => p.oneToMany(RoleClaim).mappedBy('role'),
    userCollection: () => p.oneToMany(User).mappedBy('role'),
  },
});
