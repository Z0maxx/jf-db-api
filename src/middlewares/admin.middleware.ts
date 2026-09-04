import { NextFunction, Request, Response } from "express";

export async function admin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== "admin") {
    res.status(403).send("Forbidden");
    return;
  }

  next();
}
