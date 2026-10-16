import { BaseEntity, type Ref, defineEntity, p } from "@mikro-orm/core";

import { LanEvent } from "./LanEvent";

export class LanMap extends BaseEntity {
  id!: number;
  name!: string;
  type!: TLanMapType;
  event!: Ref<LanEvent>;
}

export const LanMapType = {
  SOLDIER: "soldier",
  DEMOMAN: "demoman",
} as const;

export type TLanMapType = (typeof LanMapType)[keyof typeof LanMapType];

export const LanMapSchema = defineEntity({
  class: LanMap,
  uniques: [{ name: "unq_lan_map", properties: ["event", "name"] }],
  checks: [{ name: "chk_lan_map_name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(100),
    type: p.enum(() => LanMapType),
    event: () =>
      p.manyToOne(LanEvent).ref().updateRule("restrict").deleteRule("cascade").index("idx_lan_map"),
  },
});
