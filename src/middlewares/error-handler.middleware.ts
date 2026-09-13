import { CannotRegisterError, NotFoundError, SteamFailedError, ValidationError } from "@/errors";
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _: Request, res: Response, __: NextFunction) {
  console.log(err);

  const errObj = getError(err);
  if (err instanceof ValidationError) {
    res.status(400).json(errObj);
    return;
  }

  if (err instanceof CannotRegisterError) {
    res.status(403).json(errObj);
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json(errObj);
    return;
  }

  if (err instanceof SteamFailedError) {
    res.status(502).json(errObj);
    return;
  }

  res.status(500).send("Something went wrong");
}

function getError(err: Error) {
  return { errorMessage: err.message, errorCode: err.name };
}
