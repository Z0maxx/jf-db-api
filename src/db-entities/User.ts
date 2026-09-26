import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";

import { AllOutParticipant } from "./AllOutParticipant";
import { BountyCompletion } from "./BountyCompletion";
import { Division } from "./Division";
import { MonthlyParticipant } from "./MonthlyParticipant";
import { Role } from "./Role";
import { TournamentParticipant } from "./TournamentParticipant";

export class User extends BaseEntity {
  id!: number;
  steam64Id!: string;
  tempusId?: number = NaN;
  tempusIdStatus!: TUserTempusIdStatus;
  role!: Ref<Role>;
  divisionCollection = new Collection<Division>(this);
  allOutParticipantCollection = new Collection<AllOutParticipant>(this);
  bountyCompletionCollection = new Collection<BountyCompletion>(this);
  monthlyParticipantCollection = new Collection<MonthlyParticipant>(this);
  tournamentParticipantCollection = new Collection<TournamentParticipant>(this);
}

export const UserTempusIdStatus = {
  UNSET: "unset",
  VERIFYING: "verifying",
  VERIFIED: "verified",
  FAILED: "failed",
} as const;

export type TUserTempusIdStatus = (typeof UserTempusIdStatus)[keyof typeof UserTempusIdStatus];

export const UserSchema = defineEntity({
  class: User,
  uniques: [{ name: "unq_user", properties: ["steam64Id", "tempusId"] }],
  checks: [
    {
      name: "chk_user_steam_64_id",
      expression: "char_length(`steam_64_id`) = 17",
    },
  ],
  properties: {
    id: p.integer().primary(),
    steam64Id: p.string().name("steam_64_id").length(17).index("idx_user"),
    tempusId: p.integer().unsigned().nullable().defaultRaw(`NULL`),
    tempusIdStatus: p.enum(() => UserTempusIdStatus),
    role: () =>
      p
        .manyToOne(Role)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("fk_user_role_id"),
    divisionCollection: () =>
      p
        .manyToMany(Division)
        .pivotTable("user_division")
        .joinColumn("user_id")
        .inverseJoinColumn("division_id"),
    allOutParticipantCollection: () => p.oneToMany(AllOutParticipant).mappedBy("user"),
    bountyCompletionCollection: () => p.oneToMany(BountyCompletion).mappedBy("user"),
    monthlyParticipantCollection: () => p.oneToMany(MonthlyParticipant).mappedBy("user"),
    tournamentParticipantCollection: () => p.oneToMany(TournamentParticipant).mappedBy("user"),
  },
});
