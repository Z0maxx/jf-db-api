import "dotenv/config";
import { ctx, initCtx } from "@/db-context";
import { createTestEntitiesAsync } from "./test-entities";
import request from "supertest";
import { User } from "@/db-entities/User";
import { authService } from "@/auth/auth.service";
import { BaseEntity } from "@mikro-orm/core";

export async function initTestsAsync() {
  await initCtx();
  ctx.orm.em = ctx.em.fork();
  await createTestEntitiesAsync();
}

export function loginAs(req: request.Test, user: User): request.Test {
  return req.set("Authorization", "Bearer " + authService.getToken({ id: user.id }));
}

export async function deleteEntitiesAsync(entities: BaseEntity[]) {
  entities.forEach((e) => ctx.em.remove(e));
  await ctx.saveAsync();
}
