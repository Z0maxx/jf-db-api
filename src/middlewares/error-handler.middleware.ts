import { NotFoundError, SteamFailedError, ValidationError } from "@/errors";
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _: Request, res: Response, __: NextFunction) {
  console.log(err);
  if (err instanceof NotFoundError) {
    res.status(404).send(err.message);
    return;
  }

  if (err instanceof SteamFailedError) {
    res.status(502).send(err.message);
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).send(err.message);
    return;
  }

  res.status(500).send("Something went wrong");
}
