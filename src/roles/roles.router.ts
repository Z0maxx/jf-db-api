import express from "express";
import { rolesService } from "./roles.service";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import z from "zod";
import { CreateRoleSchema } from "#/schemas";

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
