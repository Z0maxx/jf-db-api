import { initTestsAsync } from "../util";
import { createAllOutTestEntitiesAsync } from "./test-all-out-entities";

export async function initAllOutTestsAsync() {
  await initTestsAsync();
  await createAllOutTestEntitiesAsync();
}
