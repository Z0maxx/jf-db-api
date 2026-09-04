import { NextFunction, Request, Response } from "express";

export function id<T extends string[]>(...idNames: T) {
  return (req: Request<{ [K in T[number]]: string }>, res: Response, next: NextFunction) => {
    const invalidId = idNames.find((name) => !isIdPathParam(req, name));
    if (invalidId) {
      res.status(400).send(`Invalid ${invalidId}`);
      return;
    }

    req.ids = getIds(req, idNames) as { [K in T[number]]: number };
    next();
  };
}

function isIdPathParam(req: Request, paramName: string) {
  const param = req.params[paramName];
  return typeof param === "string" && !Number.isNaN(parseInt(param)) && parseInt(param) > 0;
}

function getIds(req: Request, idNames: string[]) {
  return Object.fromEntries(idNames.map((name) => [name, parseInt(req.params[name] as string)]));
}
