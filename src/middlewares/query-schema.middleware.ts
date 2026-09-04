import { NextFunction, Request, Response } from "express";
import z from "zod";

export function querySchema<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).send(z.prettifyError(result.error));
      return;
    }

    next();
  };
}
