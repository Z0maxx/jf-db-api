import "express-serve-static-core";
import { JwtUser } from "./types";

declare module "express-serve-static-core" {
  interface Request<P = ParamsDictionary> {
    ids: { [K in keyof P]: number };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
