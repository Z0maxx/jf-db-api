import { getDuplicates } from "#/util";

import { RoleValidator, CreateRoleDto } from "../roles.types";

type DuplicateRoleClaims = {
  role: string;
  duplicateClaims: number[];
};

export const roleUniqueClaimValidator: RoleValidator<DuplicateRoleClaims> = {
  validate(errors: string[], roles: CreateRoleDto[]) {
    const duplicateRoleClaimsList: DuplicateRoleClaims[] = [];
    roles.forEach((r) => {
      const duplicateClaims = getDuplicates(r.claimIds, (id) => id);
      if (duplicateClaims.length > 0) {
        duplicateRoleClaimsList.push({ role: r.name, duplicateClaims });
      }
    });

    errors.push(...this.getMessages(duplicateRoleClaimsList));
  },

  getMessages(duplicateRoleClaimsList: DuplicateRoleClaims[]) {
    return duplicateRoleClaimsList
      .map((d) =>
        d.duplicateClaims.map((c) => `Role '${d.role}' has duplicate claim with id '${c}'`),
      )
      .flat();
  },
};
