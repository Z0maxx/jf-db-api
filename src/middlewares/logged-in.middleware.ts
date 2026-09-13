import { envConfig } from "@/env-config";
import { AppUser } from "@/types";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function loggedIn(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header) {
      throw new Error("No header");
    }

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer") {
      throw new Error("Invalid scheme");
    }

    req.user = jwt.verify(token, envConfig.JWT_SECRET) as AppUser;
  } catch {
    res.status(401).send("Unauthorized");
    return;
  }

  next();
}
