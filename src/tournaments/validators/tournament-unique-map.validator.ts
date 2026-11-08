import { getDuplicates } from "#/util";

import { CreateTournamentEventDto, TournamentEventValidator } from "../tournaments.types";

export const tournamentUniqueMapValidator: TournamentEventValidator<string> = {
  validate(errors: string[], event: CreateTournamentEventDto) {
    errors.push(...this.getMessages(getDuplicates(event.maps, (m) => m)));
  },

  getMessages(duplicateMaps: string[]) {
    return duplicateMaps.map((m) => `Map '${m}' is duplicate`);
  },
};
