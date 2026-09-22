import { CreateRoleDto, RoleValidator } from "#/types";
import { getDuplicates } from "#/util";

export const roleDuplicateValidator: RoleValidator<string> = {
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
