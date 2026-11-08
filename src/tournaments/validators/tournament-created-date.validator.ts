import { CreateTournamentEventDto, TournamentEventValidator } from "../tournaments.types";

export const tournamentCreatedDateValidator: TournamentEventValidator<string> = {
  validate(errors: string[], event: CreateTournamentEventDto) {
    if (event.start < new Date()) {
      errors.push(...this.getMessages(["start"]));
    }
  },

  getMessages(fields: string[]) {
    return fields.map((field) => `Event ${field} cannot be in the past`);
  },
};
