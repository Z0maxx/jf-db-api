import {
  UnassignedDivisionsDeletedError,
  DivisionsHaveUsersError,
  ValidationError,
} from "#/errors";
import { DivisionDto, DivisionsListDto, DivisionValidator } from "#/types";

import { divisionsRepository } from "./divisions.repository";
import { divisionDuplicateValidator } from "./validators/division-duplicate.validator";

export const divisionsService = {
  async getAllDivisionsAsync(): Promise<DivisionsListDto> {
    const divisions = await divisionsRepository.getAllDivisionsAsync();
    const groups = Object.groupBy(divisions, (d) => d.type);
    return {
      soldier: groups.soldier!.map(({ id, name, color }) => ({ id, name, color })),
      demoman: groups.demoman!.map(({ id, name, color }) => ({ id, name, color })),
    };
  },

  async setDivisionsAsync(divisions: DivisionsListDto) {
    validate([divisionDuplicateValidator], divisions);
    checkUnassignedDivisions(divisions);
    await checkDeletedDivisionsHaveNoUsersAsync(divisions);
    await divisionsRepository.setDivisionsAsync(divisions);
  },
};

async function checkDeletedDivisionsHaveNoUsersAsync(divisions: DivisionsListDto) {
  const divisionsMap = new Map<string, DivisionDto>([
    ...divisions.soldier.map((d) => [d.name, d] as const),
    ...divisions.demoman.map((d) => [d.name, d] as const),
  ]);

  const existing = await divisionsRepository.getAllDivisionsAsync();
  const deletedNames = existing.filter((e) => !divisionsMap.get(e.name)).map((d) => d.name);
  const deletedDivisions = await divisionsRepository.getDivisionsByNameAsync(deletedNames);
  const deletedWithUsers = deletedDivisions
    .filter((d) => d.userCollection.$.length > 0)
    .map((d) => d.name);
  if (deletedWithUsers.length > 0) {
    throw new DivisionsHaveUsersError(deletedWithUsers);
  }
}

function checkUnassignedDivisions(divisions: DivisionsListDto) {
  const deleted: string[] = [];
  if (!divisions.soldier.find((d) => d.name === "Unassigned Soldier")) {
    deleted.push("Unassigned Soldier");
  }

  if (!divisions.demoman.find((d) => d.name === "Unassigned Demoman")) {
    deleted.push("Unassigned Demoman");
  }

  if (deleted.length > 0) {
    throw new UnassignedDivisionsDeletedError(deleted);
  }
}

function validate(validators: DivisionValidator[], divisions: DivisionsListDto) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, divisions));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
