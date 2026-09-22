import { DivisionType } from "#/db-entities/Division";
import {
  UnassignedDivisionsDeletedError,
  DivisionsHaveUsersError,
  ValidationError,
} from "#/errors";
import { DivisionDto, DivisionValidator } from "#/types";
import { divisionsRepository } from "./divisions.repository";
import { divisionDuplicateValidator } from "./validators/division-duplicate.validator";

export const divisionsService = {
  async getAllDivisionsAsync(): Promise<DivisionDto[]> {
    const divisions = await divisionsRepository.getAllDivisionsAsync();
    return divisions.map(({ type, name, color }) => ({
      type,
      name,
      color,
    }));
  },

  async setDivisionsAsync(divisions: DivisionDto[]) {
    validate([divisionDuplicateValidator], divisions);
    checkUnassignedDivisions(divisions);
    await checkDeletedDivisionsHaveNoUsersAsync(divisions);
    await divisionsRepository.setDivisionsAsync(divisions);
  },
};

async function checkDeletedDivisionsHaveNoUsersAsync(divisions: DivisionDto[]) {
  const divisionsMap = new Map<string, DivisionDto>(divisions.map((d) => [d.name, d]));
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

function checkUnassignedDivisions(divisions: DivisionDto[]) {
  const deleted: string[] = [];
  if (!divisions.find((d) => d.name === "Unassigned Soldier" && d.type === DivisionType.SOLDIER)) {
    deleted.push("Unassigned Soldier");
  }

  if (!divisions.find((d) => d.name === "Unassigned Demoman" && d.type === DivisionType.DEMOMAN)) {
    deleted.push("Unassigned Demoman");
  }

  if (deleted.length > 0) {
    throw new UnassignedDivisionsDeletedError(deleted);
  }
}

function validate(validators: DivisionValidator[], divisions: DivisionDto[]) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, divisions));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
