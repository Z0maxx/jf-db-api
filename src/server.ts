import "dotenv/config";
import { app } from "./app";
import { initCtx } from "./db-context";
import { envConfig } from "./env-config";

app.listen(envConfig.PORT, async (err) => {
  await initCtx();
  console.log(err ?? "Running");
});
