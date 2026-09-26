import "express-serve-static-core";
import { JwtUser } from "./types";
import { User } from "./db-entities/User";
import { Loaded } from "@mikro-orm/core";

declare module "express-serve-static-core" {
  interface Request<P = ParamsDictionary> {
    ids: { [K in keyof P]: number };
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: Loaded<User, "divisionCollection" | "role.claimCollection"> | null;
    }
  }
}
