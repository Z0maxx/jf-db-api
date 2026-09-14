import { createTestEntitiesAsync } from "./test-entities";
import { createAllOutTestEntitiesAsync } from "./all-out/all-out-test-entities";
import { initCtx, ctx } from "#/db-context";

export async function setup(_: any) {
  await initCtx();
  ctx.orm.em = ctx.em.fork();
  await createTestEntitiesAsync();
  await createAllOutTestEntitiesAsync();
  console.log("ran api global setup");
}

export async function teardown() {
  await ctx.orm.close(true);
  console.log("ran api global teardown");
}
