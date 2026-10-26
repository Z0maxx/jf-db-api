import { RequestContext } from "@mikro-orm/core";
import express from "express";
import "dotenv/config";

import { allOutRouter } from "./all-out/all-out.router";
import { authRouter } from "./auth/auth.router";
import { claimsRouter } from "./claims/claims.router";
import { ctx } from "./db-context";
import { divisionsRouter } from "./divisions/divisions.router";
import { envConfig } from "./env-config";
import { lanRouter } from "./lan/lan.router";
import { errorHandler } from "./middlewares/error-handler.middleware";
import { monthliesRouter } from "./monthlies/monthlies.router";
import { rolesRouter } from "./roles/roles.router";
import { usersRouter } from "./users/users.router";

process.env.TZ = "UTC"

export const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", envConfig.CORS_ALLOW_ORIGIN);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send();
    return;
  }

  next();
});

app.use((_, __, next) => {
  RequestContext.create(ctx.orm.em, next);
});

app.use("/monthlies", monthliesRouter);
app.use("/lan", lanRouter);
app.use("/all-out", allOutRouter);
app.use("/auth", authRouter);
app.use("/divisions", divisionsRouter);
app.use("/claims", claimsRouter);
app.use("/roles", rolesRouter);
app.use("/users", usersRouter);

app.use(errorHandler);
