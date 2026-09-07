import { BaseEntity, Collection, defineEntity, p } from "@mikro-orm/core";
import { AllOutParticipantDivision } from "./AllOutParticipantDivision";
import { AllOutStage1Map } from "./AllOutStage1Map";
import { AllOutStage2Map } from "./AllOutStage2Map";
import { AllOutStage3Map } from "./AllOutStage3Map";
import { BountyPrize } from "./BountyPrize";
import { MonthlyParticipant } from "./MonthlyParticipant";
import { MonthlyParticipantDivision } from "./MonthlyParticipantDivision";
import { UserDivision } from "./UserDivision";

export class Division extends BaseEntity {
  id!: number;
  name!: string;
  color!: string;
  type!: TDivisionType;
  allOutParticipantDivisionCollection = new Collection<AllOutParticipantDivision>(this);
  allOutStage1MapCollection = new Collection<AllOutStage1Map>(this);
  allOutStage2MapCollection = new Collection<AllOutStage2Map>(this);
  allOutStage3MapCollection = new Collection<AllOutStage3Map>(this);
  bountyPrizeCollection = new Collection<BountyPrize>(this);
  monthlyParticipantCollection = new Collection<MonthlyParticipant>(this);
  monthlyParticipantDivisionCollection = new Collection<MonthlyParticipantDivision>(this);
  userDivisionCollection = new Collection<UserDivision>(this);
}

export const DivisionType = {
  SOLDIER: "soldier",
  DEMOMAN: "demoman",
} as const;

export type TDivisionType = (typeof DivisionType)[keyof typeof DivisionType];

export const DivisionSchema = defineEntity({
  class: Division,
  checks: [
    { name: "chk_division_color", expression: "char_length(`color`) = 6" },
    { name: "chk_division_name", expression: "char_length(`name`) > 0" },
  ],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(30).unique("unq_division"),
    color: p.string().length(6),
    type: p.enum(() => DivisionType),
    allOutParticipantDivisionCollection: () =>
      p.oneToMany(AllOutParticipantDivision).mappedBy("division"),
    allOutStage1MapCollection: () => p.oneToMany(AllOutStage1Map).mappedBy("division"),
    allOutStage2MapCollection: () => p.oneToMany(AllOutStage2Map).mappedBy("division"),
    allOutStage3MapCollection: () => p.oneToMany(AllOutStage3Map).mappedBy("division"),
    bountyPrizeCollection: () => p.oneToMany(BountyPrize).mappedBy("division"),
    monthlyParticipantCollection: () => p.oneToMany(MonthlyParticipant).mappedBy("division"),
    monthlyParticipantDivisionCollection: () =>
      p.oneToMany(MonthlyParticipantDivision).mappedBy("division"),
    userDivisionCollection: () => p.oneToMany(UserDivision).mappedBy("division"),
  },
});
