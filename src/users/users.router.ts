import { AppError } from "#/errors";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { querySchema } from "#/middlewares/query-schema.middleware";
import { userCan } from "#/middlewares/user-can.middleware";
import { SetUserDivisionsSchema, SetUserRoleSchema, TempusIdSchema, UserQuerySchema } from "#/schemas";
import { initSse } from "#/sse";
import { TempusIdVerificationResult } from "#/types";
import express from "express";

import { usersService } from "./users.service";

export const usersRouter = express.Router();

usersRouter.get("/", querySchema(UserQuerySchema), async (req, res) => {
  const { query } = UserQuerySchema.parse(req.query);
  res.status(200).json(await usersService.queryUsersAsync(query));
});

usersRouter.post("/set-role", loggedIn, userCan("manage users"), bodySchema(SetUserRoleSchema), async (req, res) => {
  await usersService.setUserRoleAsync(req.user!, SetUserRoleSchema.parse(req.body))
  res.status(204).send()
})

usersRouter.post(
  "/set-divisions",
  loggedIn,
  userCan("manage user divisions"),
  bodySchema(SetUserDivisionsSchema),
  async (req, res) => {
    await usersService.setUserDivisionsAsync(SetUserDivisionsSchema.parse(req.body));
    res.status(204).send();
  },
);

usersRouter.post("/set-tempus-id", loggedIn, bodySchema(TempusIdSchema), async (req, res) => {
  const sse = initSse(res);
  const user = req.user!;
  const { tempusId } = TempusIdSchema.parse(req.body);
  try {
    const status = await usersService.verifyAndSetTempusIdAsync(user, tempusId);
    const result: TempusIdVerificationResult = { status, tempusId };
    sse.send("Result", result);
  } catch (err) {
    console.log(err);
    if (err instanceof AppError) {
      sse.send("Error", getAppError(err as AppError));
    } else {
      sse.send("Error", "Something went wrong");
    }
  }

  sse.close();
});
