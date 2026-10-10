import { CreateLanEventDto, LanEventValidator } from "#/types";

export const lanCreatedDateValidator: LanEventValidator<string> = {
  validate(errors: string[], event: CreateLanEventDto) {
    const now = new Date();
    const fields = [
      {
        date: event.start,
        name: "start",
      },
      {
        date: event.end,
        name: "end",
      },
    ]
      .filter((df) => df.date && df.date < now)
      .map((df) => df.name);

    errors.push(...this.getMessages(fields));
  },

  getMessages(fields: string[]) {
    return fields.map((f) => `Event ${f} cannot be in the past`);
  },
};
