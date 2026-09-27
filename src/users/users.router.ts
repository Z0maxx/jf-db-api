import { AppError } from "#/errors";
import { bodySchema } from "#/middlewares/body-schema.middleware";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { loggedIn } from "#/middlewares/logged-in.middleware";
import { TempusIdVerificationResult } from "#/types";
import express from "express";
import { Response } from "express";
import z from "zod";

import { usersService } from "./users.service";

const TempusIdSchema = z.object({
  tempusId: z.number().positive(),
});

export const usersRouter = express.Router();

usersRouter.post("/tempus-id", loggedIn, bodySchema(TempusIdSchema), async (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.addListener("close", () => res.end());

  const user = req.user!;
  const { tempusId } = TempusIdSchema.parse(req.body);
  try {
    const status = await usersService.verifyAndSetTempusIdAsync(user, tempusId);
    const result: TempusIdVerificationResult = { status, tempusId };
    res.write("event: Result\n");
    res.write(`data: ${JSON.stringify(result)}\n\n`);
  } catch (err) {
    console.log(err);
    res.write("event: Error\n");
    if (err instanceof AppError) {
      res.write(`data: ${JSON.stringify(getAppError(err as AppError))}\n\n`);
    } else {
      res.write(`data: Something went wrong\n\n`);
    }
  }

  res.end();
});
