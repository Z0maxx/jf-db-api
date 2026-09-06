import { MikroORM } from "@mikro-orm/sql";
import { AllOutEvent } from "./db-entities/AllOutEvent";
import { AllOutParticipant } from "./db-entities/AllOutParticipant";
import { AllOutStage1Map } from "./db-entities/AllOutStage1Map";
import { AllOutStage1LeaderboardItem } from "./db-entities/AllOutStage1LeaderboardItem";
import { AllOutStage2Map } from "./db-entities/AllOutStage2Map";
import { AllOutStage2LeaderboardItem } from "./db-entities/AllOutStage2LeaderboardItem";
import { AllOutStage3LeaderboardItem } from "./db-entities/AllOutStage3LeaderboardItem";
import { AllOutStage3Map } from "./db-entities/AllOutStage3Map";
import mikroOrmConfig from "./mikro-orm.config";
import { User } from "./db-entities/User";
import { UserDivision } from "./db-entities/UserDivision";
import { AllOutParticipantDivision } from "./db-entities/AllOutParticipantDivision";
import { Role } from "./db-entities/Role";
import { RoleClaim } from "./db-entities/RoleClaim";
import { Claim } from "./db-entities/Claim";

const orm: MikroORM = null!;
const ctx = {
  orm,
  get em() {
    return this.orm.em;
  },
  get users() {
    return this.em.getRepository(User);
  },
  get userDivisions() {
    return this.em.getRepository(UserDivision);
  },
  get roles() {
    return this.em.getRepository(Role)
  },
  get claims() {
    return this.em.getRepository(Claim)
  },
  get roleClaims() {
    return this.em.getRepository(RoleClaim)
  },
  get allOut() {
    return {
      events: this.em.getRepository(AllOutEvent),
      participants: this.em.getRepository(AllOutParticipant),
      participantDivisions: this.em.getRepository(AllOutParticipantDivision),
      stage1Maps: this.em.getRepository(AllOutStage1Map),
      stage1Leaderboard: this.em.getRepository(AllOutStage1LeaderboardItem),
      stage2Maps: this.em.getRepository(AllOutStage2Map),
      stage2Leaderboard: this.em.getRepository(AllOutStage2LeaderboardItem),
      stage3Maps: this.em.getRepository(AllOutStage3Map),
      stage3Leaderboard: this.em.getRepository(AllOutStage3LeaderboardItem),
    };
  },
  saveAsync() {
    return this.em.flush();
  },
};

export default ctx;

export async function initCtx() {
  if (ctx.orm) {
    return;
  }

  ctx.orm = await MikroORM.init(mikroOrmConfig);
  await seedAsync()
}

async function seedAsync() {
  let claims: Claim[] = await ctx.claims.findAll()
  if (claims.length === 0) {
    const claimNames = [
      'manage roles',
      'manage users',
      'manage divisions',
      'manage events'
    ]

    claimNames
      .map(name => ({ name }))
      .forEach(claim => ctx.claims.create(claim))
  }

  if (await ctx.roles.find({ name: 'user' })) {
    claims.push(ctx.roles.create({ level: 9999, name: 'user' }))
  }

  if (await ctx.roles.find({ name: 'head admin' })) {
    const headAdminRole = ctx.roles.create({ level: 0, name: 'head admin' })
    claims.forEach(claim => ctx.roleClaims.create({ role: headAdminRole, claim }))
  }


}