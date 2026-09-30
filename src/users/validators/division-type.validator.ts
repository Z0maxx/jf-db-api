import { DivisionType, TDivisionType } from "#/db-entities/Division";
import { UserDivisions } from "#/types";

type InvalidDivisionType = {
  divisionId: number;
  divisionType: TDivisionType;
};

export const divisionTypeValidator = {
  validate(errors: string[], { soldierDivision, demomanDivision }: UserDivisions) {
    const invalidDivisionTypes: InvalidDivisionType[] = [];
    if (soldierDivision.type !== DivisionType.SOLDIER) {
      invalidDivisionTypes.push({
        divisionId: soldierDivision.id,
        divisionType: soldierDivision.type,
      });
    }

    if (demomanDivision.type !== DivisionType.DEMOMAN) {
      invalidDivisionTypes.push({
        divisionId: demomanDivision.id,
        divisionType: demomanDivision.type,
      });
    }

    errors.push(...this.getMessages(invalidDivisionTypes));
  },

  getMessages(invalidDivisionTypes: InvalidDivisionType[]) {
    return invalidDivisionTypes.map(
      (d) => `Division with id '${d.divisionId}' is a ${d.divisionType} division`,
    );
  },
};
