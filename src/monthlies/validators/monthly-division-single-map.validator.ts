import { MonthlyEventValidator, CreateMonthlyEventDto } from "../monthlies.types";

export const monthlyDivisionSingleMapValidator: MonthlyEventValidator<number> = {
  validate(errors: string[], event: CreateMonthlyEventDto) {
    const divisionIds = new Set<number>();
    const divisionsWithMultipleMaps: number[] = [];
    event.maps.forEach(({ divisionId }) => {
      if (divisionIds.has(divisionId)) {
        divisionsWithMultipleMaps.push(divisionId);
      } else {
        divisionIds.add(divisionId);
      }
    });

    errors.push(...this.getMessages(divisionsWithMultipleMaps));
  },

  getMessages(divisionsWithMultipleMaps: number[]) {
    return divisionsWithMultipleMaps.map((dId) => `Division with id '${dId}' has multiple maps`);
  },
};
