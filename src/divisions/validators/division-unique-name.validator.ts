import { getDuplicates } from "#/util";

import { DivisionsListDto, DivisionValidator } from "../divisions.types";

export const divisionUniqueNameValidator: DivisionValidator = {
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
