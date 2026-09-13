import { RequestContext } from "@mikro-orm/core";
import express from "express";
import "dotenv/config";
import { ctx } from "./db-context";
import { allOutRouter } from "./all-out/all-out.router";
import { authRouter } from "./auth/auth.router";
import { errorHandler } from "./middlewares/error-handler.middleware";

export const app = express();
app.use(express.json());
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use((_, __, next) => {
  RequestContext.create(ctx.orm.em, next);
});

app.use("/all-out", allOutRouter);
app.use("/auth", authRouter);
app.use(errorHandler);
