import { NotFoundError, SteamFailedError, ValidationError } from "@/errors";
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _: Request, res: Response, __: NextFunction) {
  console.log(err);
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message, errorCode: err.name });
    return;
  }

  if (err instanceof SteamFailedError) {
    res.status(502).json({ error: err.message, errorCode: err.name });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, errorCode: err.name });
    return;
  }

  res.status(500).json({ error: "Something went wrong" });
}
