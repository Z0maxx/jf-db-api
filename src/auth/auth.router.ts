import express from "express";
import authService from "./auth.service";
import steamUsers from "@/steam/steam-users";
import { authResponse } from "@/types";
import ctx from "@/db-context";

const authRouter = express.Router();

authRouter.get("/init", (_, res) => {
  res.redirect(authService.getLoginUrl());
});

authRouter.get("/callback", async (req, res) => {
  const queryString = req.originalUrl.split("?", 2)[1] ?? "";
  const steamId64 = await authService.verifyCallbackAsync(new URLSearchParams(queryString));
  res.status(200).json(authService.getAuthResponse(steamId64));
});

export default authRouter;