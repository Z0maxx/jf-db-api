import { MonthlyEvent } from "#/db-entities/MonthlyEvent";

import { MonthlyEventValidator, CreateMonthlyEventDto } from "../monthlies.types";

export const monthlyUpdatedDateValidator: MonthlyEventValidator<string> = {
  validate(errors: string[], event: CreateMonthlyEventDto, _, originalEvent: MonthlyEvent) {
    const now = new Date();
    const fields = [
      {
        originalDate: originalEvent.start,
        date: event.start,
        name: "start",
      },
      {
        originalDate: originalEvent.end,
        date: event.end,
        name: "end",
      },
    ]
      .filter((df) => df.date && df.date < now && df.date.getTime() !== df.originalDate?.getTime())
      .map((df) => df.name);

    errors.push(...this.getMessages(fields));
  },

  getMessages(fields: string[]) {
    return fields.map((f) => `Event ${f} must be the same as current ${f} or be in the future`);
  },
};
