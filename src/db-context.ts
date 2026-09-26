import { MikroORM } from "@mikro-orm/sql";

import { claimNames } from "./claim-names";
import { AllOutEvent } from "./db-entities/AllOutEvent";
import { AllOutParticipant } from "./db-entities/AllOutParticipant";
import { AllOutStage1LeaderboardItem } from "./db-entities/AllOutStage1LeaderboardItem";
import { AllOutStage1Map } from "./db-entities/AllOutStage1Map";
import { AllOutStage2LeaderboardItem } from "./db-entities/AllOutStage2LeaderboardItem";
import { AllOutStage2Map } from "./db-entities/AllOutStage2Map";
import { AllOutStage3LeaderboardItem } from "./db-entities/AllOutStage3LeaderboardItem";
import { AllOutStage3Map } from "./db-entities/AllOutStage3Map";
import { Claim } from "./db-entities/Claim";
import { Division, DivisionType } from "./db-entities/Division";
import { Role } from "./db-entities/Role";
import { User } from "./db-entities/User";
import mikroOrmConfig from "./mikro-orm.config";

const orm: MikroORM = null!;
export const ctx = {
  orm,
  get em() {
    return this.orm.em;
  },
  get divisions() {
    return this.em.getRepository(Division);
  },
  get users() {
    return this.em.getRepository(User);
  },
  get roles() {
    return this.em.getRepository(Role);
  },
  get claims() {
    return this.em.getRepository(Claim);
  },
  get allOut() {
    return {
      events: this.em.getRepository(AllOutEvent),
      participants: this.em.getRepository(AllOutParticipant),
      stage1Maps: this.em.getRepository(AllOutStage1Map),
      stage1Leaderboard: this.em.getRepository(AllOutStage1LeaderboardItem),
      stage2Maps: this.em.getRepository(AllOutStage2Map),
      stage2Leaderboard: this.em.getRepository(AllOutStage2LeaderboardItem),
      stage3Maps: this.em.getRepository(AllOutStage3Map),
      stage3Leaderboard: this.em.getRepository(AllOutStage3LeaderboardItem),
    };
  },
  async saveAsync() {
    return await this.em.flush();
  },
};

export async function initCtx() {
  if (ctx.orm) {
    return;
  }

  ctx.orm = await MikroORM.init(mikroOrmConfig);
  await seedAsync();
}

async function seedAsync() {
  ctx.orm.em = ctx.orm.em.fork();
  let claims: Claim[] = await ctx.claims.findAll();
  if (claims.length === 0) {
    claims = claimNames.map((name) => ctx.claims.create({ name }));
  }

  if (!(await ctx.roles.findOne({ name: "user" }))) {
    ctx.roles.create({ name: "user" });
  }

  if (!(await ctx.roles.findOne({ name: "head admin" }))) {
    const headAdminRole = ctx.roles.create({ name: "head admin" });
    headAdminRole.claimCollection.set(claims);
  }

  if (!(await ctx.divisions.findOne({ name: "Unassigned Soldier" }))) {
    ctx.divisions.create({
      type: DivisionType.SOLDIER,
      name: "Unassigned Soldier",
      color: "FFFFFF",
    });
  }

  if (!(await ctx.divisions.findOne({ name: "Unassigned Demoman" }))) {
    ctx.divisions.create({
      type: DivisionType.DEMOMAN,
      name: "Unassigned Demoman",
      color: "FFFFFF",
    });
  }

  await ctx.saveAsync();
}
