import { getDuplicates } from "#/util";

import { CreateTournamentEventDto, TournamentEventValidator } from "../tournaments.types";

export const tournamentUniqueParticipantValidator: TournamentEventValidator<number> = {
  validate(errors: string[], event: CreateTournamentEventDto) {
    const duplicates = getDuplicates(event.participants, (participant) => participant.userId);
    errors.push(...this.getMessages(duplicates.map((participant) => participant.userId)));
  },

  getMessages(duplicateUsers: number[]) {
    return duplicateUsers.map((uId) => `Participant with user id '${uId}' is duplicate`);
  },
};
