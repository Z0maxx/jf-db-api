import { User } from "#/db-entities/User";
import { ConflictError, ForbiddenError, NotFoundByIdsError } from "#/errors";

export class AlreadySetTempusIdError extends ConflictError {
  constructor(user: User) {
    super();
    this.message = `User with id '${user.id}' has already set their tempus id`;
    this.name = "AlreadySetTempusIdError";
  }
}

export class UsersNotFoundError extends NotFoundByIdsError {
  constructor(userIds: number[]) {
    super("User", userIds);
    this.name = "UsersNotFoundError";
  }
}

export class CannotSetOwnRoleError extends ForbiddenError {
  constructor() {
    super();
    this.message = "Admins cannot set their own role";
    this.name = "CannotSetOwnRoleError";
  }
}

export class CannotSetRoleWithLevelError extends ForbiddenError {
  constructor() {
    super();
    this.message = "Admins can only set another user's role to a higher level one than theirs";
    this.name = "CannotSetRoleWithLevelError";
  }
}
