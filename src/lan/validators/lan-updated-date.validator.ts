import { LanEvent } from "#/db-entities/LanEvent";

import { LanEventValidator, CreateLanEventDto } from "../lan.types";

export const lanUpdatedDateValidator: LanEventValidator<string> = {
  validate(errors: string[], event: CreateLanEventDto, originalEvent: LanEvent) {
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
