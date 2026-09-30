import { DivisionsListDto, DivisionValidator } from "#/types";
import { getDuplicates } from "#/util";

export const divisionDuplicateValidator: DivisionValidator = {
  validate(errors: string[], divisions: DivisionsListDto) {
    const soldierDuplicates = getDuplicates(divisions.soldier, (d) => d.name);
    const demomanDuplicates = getDuplicates(divisions.demoman, (d) => d.name);
    errors.push(...this.getMessages({ soldier: soldierDuplicates, demoman: demomanDuplicates }));
  },

  getMessages(duplicateDivisions: DivisionsListDto) {
    return [
      ...duplicateDivisions.soldier.map((d) => `Soldier division '${d.name}' is duplicate`),
      ...duplicateDivisions.demoman.map((d) => `Demoman division '${d.name}' is duplicate`),
    ];
  },
};
