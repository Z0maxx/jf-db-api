import { getDuplicates } from "#/util";

import { SetTournamentMatchupsDto, TournamentMatchupValidator } from "../tournaments.types";

export const tournamentMatchupUniqueParticipantValidator: TournamentMatchupValidator<number> = {
  validate(errors: string[], matchups: SetTournamentMatchupsDto["matchups"]) {
    const duplicates = getDuplicates(matchups.map((m) => m.participantIds).flat(), (p) => p);
    errors.push(...this.getMessages(duplicates));
  },

  getMessages(duplicateParticipants: number[]) {
    return duplicateParticipants.map((pId) => `Participant with id '${pId}' is duplicate`);
  },
};
