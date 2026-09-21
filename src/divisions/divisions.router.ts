import express from "express";
import { divisionsService } from "./divisions.service";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import z from "zod";
import { DivisionSchema } from "#/schemas";

const DivisionListSchema = z.array(DivisionSchema);

export const divisionsRouter = express.Router();

divisionsRouter.get("/", async (_, res) => {
  res.status(200).json(await divisionsService.getAllDivisionsAsync());
});

divisionsRouter.post(
  "/",
  loggedIn,
  userCan("manage divisions"),
  bodySchema(DivisionListSchema),
  async (req, res) => {
    await divisionsService.setDivisionsAsync(DivisionListSchema.parse(req.body));
    res.status(204).send();
  },
);
