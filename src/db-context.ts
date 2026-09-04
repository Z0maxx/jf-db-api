import { EntityManager, EntityRepository, MikroORM } from "@mikro-orm/sql";
import { AllOutEvent } from "./db-entities/AllOutEvent";
import { AllOutParticipant } from "./db-entities/AllOutParticipant";
import { AllOutStage1Map } from "./db-entities/AllOutStage1Map";
import { AllOutStage1LeaderboardItem } from "./db-entities/AllOutStage1LeaderboardItem";
import { AllOutStage2Map } from "./db-entities/AllOutStage2Map";
import { AllOutStage2LeaderboardItem } from "./db-entities/AllOutStage2LeaderboardItem";
import { AllOutStage3LeaderboardItem } from "./db-entities/AllOutStage3LeaderboardItem";
import { AllOutStage3Map } from "./db-entities/AllOutStage3Map";
import mikroOrmConfig from "./mikro-orm.config";
import { Admin } from "./db-entities/Admin";

const ctx = {
  get em() {
    return this.orm.em;
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
  get admins() {
    return this.em.getRepository(Admin);
  },
  saveAsync() {
    return this.em.flush();
  },
} as {
  orm: MikroORM;
  allOut: {
    events: EntityRepository<AllOutEvent>;
    participants: EntityRepository<AllOutParticipant>;
    stage1Maps: EntityRepository<AllOutStage1Map>;
    stage1Leaderboard: EntityRepository<AllOutStage1LeaderboardItem>;
    stage2Maps: EntityRepository<AllOutStage2Map>;
    stage2Leaderboard: EntityRepository<AllOutStage2LeaderboardItem>;
    stage3Maps: EntityRepository<AllOutStage3Map>;
    stage3Leaderboard: EntityRepository<AllOutStage3LeaderboardItem>;
  };
  admins: EntityRepository<Admin>;
  em: EntityManager;
  saveAsync(): Promise<void>;
};

export async function initCtx() {
  if (ctx.orm) {
    return
  }

  const orm = await MikroORM.init(mikroOrmConfig);
  ctx.orm = orm;
}

export default ctx;
