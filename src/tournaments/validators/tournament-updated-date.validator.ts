import { TournamentEvent } from "#/db-entities/TournamentEvent";

import { CreateTournamentEventDto, TournamentEventValidator } from "../tournaments.types";

export const tournamentUpdatedDateValidator: TournamentEventValidator<string> = {
  validate(errors: string[], event: CreateTournamentEventDto, originalEvent: TournamentEvent) {
    if (event.start < new Date() && event.start.getTime() !== originalEvent.start.getTime()) {
      errors.push(...this.getMessages(["start"]));
    }
  },

  getMessages(fields: string[]) {
    return fields.map((f) => `Event ${f} must be the same as current ${f} or be in the future`);
  },
};
