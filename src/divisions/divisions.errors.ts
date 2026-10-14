import { DefaultEntitiesDeletedError, ForbiddenError, NotFoundByIdsError } from "#/errors";

export class DivisionsNotFoundError extends NotFoundByIdsError {
  constructor(divisionIds: number[]) {
    super("Division", divisionIds);
    this.name = "DivisionsNotFoundError";
  }
}

export class UnassignedDivisionsDeletedError extends DefaultEntitiesDeletedError {
  constructor(divisionNames: string[]) {
    super("Division", divisionNames);
    this.name = "UnassignedDivisionsDeletedError";
  }
}

export class DivisionsHaveUsersError extends ForbiddenError {
  constructor(divisionNames: string[]) {
    super();
    this.messages = divisionNames.map((d) => `Division '${d}' has users`);
    this.name = "DivisionsHaveUsersError";
  }
}
