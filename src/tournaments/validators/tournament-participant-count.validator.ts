import { CreateTournamentEventDto, TournamentEventValidator } from "../tournaments.types";

export const tournamentParticipantCountValidator: TournamentEventValidator<never> = {
  validate(errors: string[], event: CreateTournamentEventDto) {
    const length = event.participants.length;
    if ((length & (length - 1)) !== 0) {
      errors.push(this.getMessages()[0]);
    }
  },

  getMessages() {
    return ["The number of participants is not a power of 2"];
  },
};
