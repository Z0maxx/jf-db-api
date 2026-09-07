import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { Division } from "./Division";
import { User } from "./User";

export class UserDivision extends BaseEntity {
  id!: number;
  user!: Ref<User>;
  division!: Ref<Division>;
}

export const UserDivisionSchema = defineEntity({
  class: UserDivision,
  uniques: [{ name: "unq_user_division", properties: ["user", "division"] }],
  properties: {
    id: p.integer().primary(),
    user: () =>
      p
        .manyToOne(User)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_user_division"),
    division: () =>
      p.manyToOne(Division).ref().updateRule("restrict").index("fk_user_division_division_id"),
  },
});
