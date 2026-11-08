import "dotenv/config";
import { app } from "./app";
import { initCtx } from "./db-context";
import { seedEntitiesAsync } from "./default-entities";
import { envConfig } from "./env-config";

async function main() {
  await initCtx();
  await seedEntitiesAsync();
  app.listen(envConfig.PORT, () => {
    console.log(`Running on port ${envConfig.PORT}`);
  });
}

void main();
