import { claimNames } from "#/claim-names";
import { ctx } from "#/db-context";
import { NextFunction, Request, Response } from "express";

export function userCan(claim: (typeof claimNames)[number]) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const user = await ctx.users.findOneOrFail(
      { id: req.user!.id },
      { populate: ["role.roleClaimCollection.claim"] },
    );

    if (!user.role.$.roleClaimCollection.$.exists((rc) => rc.claim.$.name === claim)) {
      res.status(403).send("Forbidden");
      return;
    }

    next();
  };
}
