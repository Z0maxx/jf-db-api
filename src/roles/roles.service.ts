import { claimsRepository } from "#/claims/claims.repository";
import {
  ClaimsNotFoundError,
  DefaultEntitiesDeletedError,
  DefaultEntitiesModifiedError,
  RolesHaveUsersError,
  ValidationError,
} from "#/errors";
import { CreateRoleDto, RoleDto, RoleValidator } from "#/types";
import { rolesRepository } from "./roles.repository";
import { roleDuplicateClaimValidator } from "./validators/role-duplicate-claim.validator";
import { roleDuplicateValidator } from "./validators/role-duplicate.validator";

export const rolesService = {
  async getAllRolesAsync(): Promise<RoleDto[]> {
    const roles = await rolesRepository.getAllRolesAsync();
    return roles.map(({ name, claimCollection }) => ({
      name,
      claims: claimCollection.$.map(({ id, name }) => ({
        id,
        name,
      })),
    }));
  },

  async setRolesAsync(roles: CreateRoleDto[]) {
    validate([roleDuplicateValidator, roleDuplicateClaimValidator], roles);
    await checkClaimsExistAsync(roles);
    await checkDefaultRolesAsync(roles);
    await checkDeletedRolesHaveNoUsersAsync(roles);
  },
};

async function checkClaimsExistAsync(roles: CreateRoleDto[]) {
  const claimIds = roles.map((r) => r.claimIds).flat();
  const foundClaims = await claimsRepository.getClaimsByIdAsync(claimIds);
  const foundIds = foundClaims.map((f) => f.id);
  const notFoundIds = claimIds.filter((c) => !foundIds.includes(c));
  if (notFoundIds.length > 0) {
    throw new ClaimsNotFoundError(notFoundIds);
  }
}

async function checkDefaultRolesAsync(roles: CreateRoleDto[]) {
  const defaultRoles = await rolesRepository.getDefaultRolesAsync();
  const roleNames = roles.map((r) => r.name);
  const deleted: string[] = defaultRoles.map((d) => d.name).filter((r) => !roleNames.includes(r));
  if (deleted.length > 0) {
    throw new DefaultEntitiesDeletedError("Role", deleted);
  }

  const modified = defaultRoles
    .filter((d) => {
      const defaultClaimIds = d.claimCollection.$.map((c) => c.id).sort();
      const claimIds = roles.find((r) => r.name === d.name)!.claimIds.sort();
      return JSON.stringify(defaultClaimIds) !== JSON.stringify(claimIds);
    })
    .map((m) => m.name);

  if (modified.length > 0) {
    throw new DefaultEntitiesModifiedError("Role", modified);
  }
}

async function checkDeletedRolesHaveNoUsersAsync(roles: CreateRoleDto[]) {
  const rolesMap = new Map<string, CreateRoleDto>(roles.map((r) => [r.name, r]));
  const existing = await rolesRepository.getAllRolesAsync();
  const deletedNames = existing.filter((e) => !rolesMap.get(e.name)).map((d) => d.name);
  const deletedRoles = await rolesRepository.getRolesByNameAsync(deletedNames);
  const deletedWithUsers = deletedRoles
    .filter((d) => d.userCollection.$.length > 0)
    .map((d) => d.name);

  if (deletedWithUsers.length > 0) {
    throw new RolesHaveUsersError(deletedWithUsers);
  }
}

function validate(validators: RoleValidator<any>[], roles: CreateRoleDto[]) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, roles));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
