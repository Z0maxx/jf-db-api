import { envConfig } from "#/env-config";
import { AppUser } from "#/types";
import { usersRepository } from "#/users/users.repository";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export async function loggedIn(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      throw new Error("No header");
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer") {
      throw new Error("Invalid scheme");
    }

    const jwtUser = jwt.verify(token, envConfig.JWT_SECRET) as AppUser;
    req.user = await usersRepository.getUserByIdAsync(jwtUser.id)
  } catch {
    res.status(401).send("Unauthorized");
    return;
  }

  next();
}
