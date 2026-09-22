import { BaseEntity, Collection, defineEntity, p } from "@mikro-orm/core";
import { Role } from "./Role";

export class Claim extends BaseEntity {
  id!: number;
  name!: string;
  roleCollection = new Collection<Role>(this);
}

export const ClaimSchema = defineEntity({
  class: Claim,
  checks: [{ name: "chk_claim_name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(20).unique("unq_claim"),
    roleCollection: () => p.manyToMany(Role).mappedBy("claimCollection"),
  },
});
