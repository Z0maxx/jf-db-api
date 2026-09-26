import { bodySchema } from "#/middlewares/body-schema.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { CreateRoleSchema } from "#/schemas";
import express from "express";
import z from "zod";

import { rolesService } from "./roles.service";

const CreateRoleListSchema = z.array(CreateRoleSchema);

export const rolesRouter = express.Router();

rolesRouter.get("/", async (_, res) => {
  res.status(200).json(await rolesService.getAllRolesAsync());
});

rolesRouter.post(
  "/",
  loggedIn,
  userCan("manage roles"),
  bodySchema(CreateRoleListSchema),
  async (req, res) => {
    await rolesService.setRolesAsync(CreateRoleListSchema.parse(req.body));
    res.status(204).send();
  },
);
