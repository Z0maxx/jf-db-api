import { Division } from "#/db-entities/Division";

import { CreateMonthlyEventDto, MonthlyEventValidator } from "../monthlies.types";

export const monthlyDivisionTypeValidator: MonthlyEventValidator<number> = {
  validate(errors: string[], event: CreateMonthlyEventDto, divisions: Division[]) {
    const notMatchingDivisionIds = divisions.filter((d) => d.type !== event.type).map((d) => d.id);
    if (notMatchingDivisionIds.length > 0) {
      errors.push(...this.getMessages(notMatchingDivisionIds));
    }
  },

  getMessages(notMatchingDivisionIds: number[]) {
    return notMatchingDivisionIds.map(
      (dId) => `Type of division with id '${dId}' does not match event's type`,
    );
  },
};
