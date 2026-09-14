import "dotenv/config";
import { ctx, initCtx } from "#/db-context";
import request from "supertest";
import { User } from "#/db-entities/User";
import { authService } from "#/auth/auth.service";
import { BaseEntity } from "@mikro-orm/core";
import { createAllOutTestEntitiesAsync } from "./all-out/all-out-test-entities";
import { createTestEntitiesAsync } from "./test-entities";

export async function setupApiTestSuiteAsync() {
  await initCtx();
  ctx.orm.em = ctx.em.fork();
  await createTestEntitiesAsync();
  await createAllOutTestEntitiesAsync();
}

export async function teardownApiTestSuiteAsync(entitiesToDelete: BaseEntity[] = []) {
  await Promise.all(
    entitiesToDelete.map((e) => {
      ctx.em.remove(e);
      return ctx.saveAsync();
    }),
  );

  ctx.orm.close(true);
}

export function loginAs(req: request.Test, user: User): request.Test {
  return req.set("Authorization", "Bearer " + authService.getToken({ id: user.id }));
}
