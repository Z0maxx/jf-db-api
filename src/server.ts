import "dotenv/config";
import { initCtx } from "./db-context";
import app from "./app";

app.listen(process.env.PORT, async (err) => {
  await initCtx();
  console.log(err ?? "Running");
});
