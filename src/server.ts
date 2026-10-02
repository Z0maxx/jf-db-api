import "dotenv/config";
import { app } from "./app";
import { initCtx } from "./db-context";
import { seedEntitiesAsync } from "./default-entities";
import { envConfig } from "./env-config";

app.listen(envConfig.PORT, async (err) => {
  await initCtx();
  await seedEntitiesAsync();
  console.log(err ?? "Running");
});
