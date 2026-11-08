import { getDuplicates } from "#/util";

import { CreateTournamentEventDto, TournamentEventValidator } from "../tournaments.types";

export const tournamentUniqueParticipantAliasValidator: TournamentEventValidator<string> = {
  validate(errors: string[], event: CreateTournamentEventDto) {
    const duplicates = getDuplicates(
      event.participants.filter((p) => p.alias),
      (p) => p.alias!,
    );

    errors.push(...this.getMessages(duplicates.map((p) => p.alias!)));
  },

  getMessages(duplicateAliases: string[]) {
    return duplicateAliases.map((a) => `Participant alias '${a}' is duplicate`);
  },
};
