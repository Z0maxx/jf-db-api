import { DivisionDto, DivisionValidator } from "#/types";
import { getDuplicates } from "#/util";

export const divisionDuplicateValidator: DivisionValidator = {
  validate(errors: string[], divisions: DivisionDto[]) {
    const duplicates = getDuplicates(divisions, (d) => d.name);
    errors.push(...this.getMessages(duplicates));
  },

  getMessages(duplicateDivisions: DivisionDto[]) {
    return duplicateDivisions.map((d) => `Division '${d.name}' is duplicate`);
  },
};
