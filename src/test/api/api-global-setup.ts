import { initCtx } from "#/db-context";
import { seedEntitiesAsync } from "#/default-entities";

import { createAllOutTestEntitiesAsync } from "./all-out/all-out-test-entities";
import { createLanTestEntitiesAsync } from "./lan/lan-test-entities";
import { createMonthlyTestEntitiesAsync } from "./monthlies/monthly-test-entities";
import { createTestEntitiesAsync } from "./test-entities";

export async function setup() {
  await initCtx();
  await seedEntitiesAsync();
  await createTestEntitiesAsync();
  await createAllOutTestEntitiesAsync();
  await createLanTestEntitiesAsync();
  await createMonthlyTestEntitiesAsync();
}
