import { NotFoundByIdsError } from "#/errors";

export class ClaimsNotFoundError extends NotFoundByIdsError {
  constructor(claimIds: number[]) {
    super("Claim", claimIds);
    this.name = "ClaimsNotFoundError";
  }
}
