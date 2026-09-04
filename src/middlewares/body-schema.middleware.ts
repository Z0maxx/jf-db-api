import { NextFunction, Request, Response } from "express";
import z from "zod";

export function bodySchema<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(z.prettifyError(result.error));
    }

    req.body = result.data;
    return next();
  };
}
