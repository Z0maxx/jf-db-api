import express from "express";

import { claimsService } from "./claims.service";

export const claimsRouter = express.Router();

claimsRouter.get("/", async (_, res) => {
  res.status(200).json(await claimsService.getAllClaimsAsync());
});
