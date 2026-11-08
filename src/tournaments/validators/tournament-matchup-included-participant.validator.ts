import { TournamentParticipant } from "#/db-entities/TournamentParticipant";

import { SetTournamentMatchupsDto, TournamentMatchupValidator } from "../tournaments.types";

export const tournamentMatchupIncludedParticipantValidator: TournamentMatchupValidator<number> = {
  validate(
    errors: string[],
    matchups: SetTournamentMatchupsDto["matchups"],
    participants: TournamentParticipant[],
  ) {
    const allMatchupParticipants = matchups.map((m) => m.participantIds).flat();
    const notIncludedParticipants = participants
      .filter((p) => !allMatchupParticipants.includes(p.id))
      .map((p) => p.id);

    errors.push(...this.getMessages(notIncludedParticipants));
  },

  getMessages(notIncludedParticipants: number[]) {
    return notIncludedParticipants.map(
      (pId) => `Participant with id '${pId}' is not included in matchups`,
    );
  },
};
