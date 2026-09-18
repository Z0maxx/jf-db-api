import { AppError, ValidationError } from "#/errors";
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error | AppError, _: Request, res: Response, __: NextFunction) {
  console.log(err);

  if (err instanceof AppError) {
    res.status(err.httpCode).json(getAppError(err));
    return;
  }

  res.status(500).send("Something went wrong");
}

function getAppError(appErr: AppError) {
  if (appErr instanceof ValidationError) {
    return { errorMessages: appErr.messages, errorCode: appErr.name };
  }

  return { errorMessage: appErr.message, errorCode: appErr.name };
}
