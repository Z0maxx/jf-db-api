import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";

import { BountyMap } from "./BountyMap";
import { User } from "./User";

export class BountyCompletion extends BaseEntity {
  id!: number;
  user!: Ref<User>;
  map!: Ref<BountyMap>;
}

export const BountyCompletionSchema = defineEntity({
  class: BountyCompletion,
  indexes: [{ name: "idx_bounty_completion_3", properties: ["map", "user"] }],
  properties: {
    id: p.integer().primary(),
    user: () =>
      p
        .manyToOne(User)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_bounty_completion_2"),
    map: () => p.manyToOne(BountyMap).ref().updateRule("restrict").index("idx_bounty_completion_1"),
  },
});
