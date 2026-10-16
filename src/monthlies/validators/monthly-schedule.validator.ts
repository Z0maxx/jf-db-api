import { Schedule } from "#/types";

import { CreateMonthlyEventDto, MonthlyEventValidator } from "../monthlies.types";

export const monthlyScheduleValidator: MonthlyEventValidator<Schedule> = {
  validate(errors: string[], event: CreateMonthlyEventDto) {
    if (event.start > event.end) {
      errors.push(...this.getMessages([{ earlier: "start time", later: "end time" }]));
    }
  },

  getMessages(invalidSchedules: Schedule[]) {
    return invalidSchedules.map((s) => `${s.later} cannot be earlier than ${s.earlier}`);
  },
};
