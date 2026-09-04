import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";
import { BountyMap } from "./BountyMap";

export class BountyCompletion extends BaseEntity {
  id!: number;
  steamId64!: string;
  map!: Ref<BountyMap>;
}

export const BountyCompletionSchema = defineEntity({
  class: BountyCompletion,
  checks: [
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
    { name: "steam_id_64", expression: "char_length(`steam_id_64`) = 17" },
  ],
  properties: {
    id: p.integer().primary(),
    steamId64: p.string().name("steam_id_64").length(17),
    map: () =>
      p
        .manyToOne(BountyMap)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_bounty_completion"),
  },
});
