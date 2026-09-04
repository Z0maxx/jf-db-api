import express from "express";
import steamAuthService from "./steam-auth.service";
import steamUsers from "@/steam/steam-users";
import { SteamAuthResponse } from "@/types";
import ctx from "@/db-context";

const steamAuthRouter = express.Router();

steamAuthRouter.get("/init", (_, res) => {
  res.redirect(steamAuthService.getLoginUrl());
});

steamAuthRouter.get("/callback", async (req, res) => {
  const queryString = req.originalUrl.split("?", 2)[1] ?? "";
  const steamId64 = await steamAuthService.verifyCallbackAsync(new URLSearchParams(queryString));
  const user = await steamUsers.getUserAsync(steamId64);
  const role = await getUserRoleAsync(user.steamId64);
  const token = steamAuthService.createToken({ steamId64: user.steamId64, role });
  const authResp: SteamAuthResponse = { token, role, user };
  res.status(200).json(authResp);
});

export default steamAuthRouter;

async function getUserRoleAsync(steamId64: string) {
  const isAdmin = !!(await ctx.admins.findOne({ steamId64 }));
  return isAdmin ? "admin" : "user";
}
