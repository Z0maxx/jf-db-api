import {
  ForbiddenError,
  DefaultEntitiesDeletedError,
  DefaultEntitiesModifiedError,
  NotFoundByIdError,
} from "#/errors";

export class RoleNotFoundError extends NotFoundByIdError {
  constructor(roleId: number) {
    super("Role", roleId);
    this.name = "RoleNotFoundError";
  }
}

export class RolesHaveUsersError extends ForbiddenError {
  constructor(roleNames: string[]) {
    super();
    this.messages = roleNames.map((r) => `Role '${r}' has users`);
    this.name = "RolesHaveUsersError";
  }
}

export class DefaultRolesDeletedError extends DefaultEntitiesDeletedError {
  constructor(roleNames: string[]) {
    super("Role", roleNames);
    this.name = "DefaultRolesDeletedError";
  }
}

export class DefaultRolesModifiedError extends DefaultEntitiesModifiedError {
  constructor(roleNames: string[]) {
    super("Role", roleNames);
    this.name = "DefaultRolesModifiedError";
  }
}
