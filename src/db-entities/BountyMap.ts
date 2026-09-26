import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";

import { BountyCompletion } from "./BountyCompletion";
import { BountyPrize } from "./BountyPrize";

export class BountyMap extends BaseEntity {
  id!: number;
  name!: string;
  prize!: Ref<BountyPrize>;
  bountyCompletionCollection = new Collection<BountyCompletion>(this);
}

export const BountyMapSchema = defineEntity({
  class: BountyMap,
  checks: [{ name: "chk_bounty_map_name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(50),
    prize: () =>
      p
        .manyToOne(BountyPrize)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_bounty_map"),
    bountyCompletionCollection: () => p.oneToMany(BountyCompletion).mappedBy("map"),
  },
});
