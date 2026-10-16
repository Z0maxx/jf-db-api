import { getDuplicates } from "#/util";

import { RoleValidator, CreateRoleDto } from "../roles.types";

export const roleUniqueNameValidator: RoleValidator<string> = {
  validate(errors: string[], roles: CreateRoleDto[]) {
    const duplicates = getDuplicates(
      roles.map((r) => r.name),
      (n) => n,
    );
    errors.push(...this.getMessages(duplicates));
  },

  getMessages(duplicateRoles: string[]) {
    return duplicateRoles.map((r) => `Role '${r}' is duplicate`);
  },
};
