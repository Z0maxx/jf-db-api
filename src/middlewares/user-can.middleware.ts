import { NextFunction, Request, Response } from "express";

import { claimNames } from "#/claim-names";
import { ctx } from "#/db-context";

export function userCan(claim: (typeof claimNames)[number]) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const user = await ctx.users.findOneOrFail(
      { id: req.user!.id },
      { populate: ["role.claimCollection"] },
    );

    if (!user.role.$.claimCollection.$.exists((c) => c.name === claim)) {
      res.status(403).send("Forbidden");
      return;
    }

    next();
  };
}
