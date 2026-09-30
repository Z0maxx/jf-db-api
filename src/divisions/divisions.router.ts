import { bodySchema } from "#/middlewares/body-schema.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { DivisionsListSchema } from "#/schemas";
import express from "express";

import { divisionsService } from "./divisions.service";

export const divisionsRouter = express.Router();

divisionsRouter.get("/", async (_, res) => {
  res.status(200).json(await divisionsService.getAllDivisionsAsync());
});

divisionsRouter.post(
  "/",
  loggedIn,
  userCan("manage divisions"),
  bodySchema(DivisionsListSchema),
  async (req, res) => {
    await divisionsService.setDivisionsAsync(DivisionsListSchema.parse(req.body));
    res.status(204).send();
  },
);
