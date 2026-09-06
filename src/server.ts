import "dotenv/config";
import { initCtx } from "./db-context";
import app from "./app";
import envConfig from "./env-config";

app.listen(envConfig.PORT, async (err) => {
  await initCtx();
  console.log(err ?? "Running");
});
