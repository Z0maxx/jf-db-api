import { DivisionsHaveUsersError, ValidationError } from "#/errors";
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
    await checkDeletedDivisionsHaveNoUsersAsync(divisions);
    await divisionsRepository.setDivisionsAsync(divisions);
  },
};

async function checkDeletedDivisionsHaveNoUsersAsync(divisions: DivisionDto[]) {
  const divisionsMap = new Map<string, DivisionDto>(divisions.map((d) => [d.name, d]));
  const existingDivisions = await divisionsRepository.getAllDivisionsAsync();
  const deletedNames = existingDivisions
    .filter((e) => !divisionsMap.get(e.name))
    .map((d) => d.name);
    
  const deletedDivisions = await divisionsRepository.getDivisionsWithUsers(deletedNames);
  const deletedWithUsers = deletedDivisions.filter((d) => d.userCollection.$.length > 0);
  if (deletedWithUsers.length > 0) {
    throw new DivisionsHaveUsersError(deletedWithUsers.map((d) => d.name));
  }
}

function validate(validators: DivisionValidator[], divisions: DivisionDto[]) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, divisions));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
