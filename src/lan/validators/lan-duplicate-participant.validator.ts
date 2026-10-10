import { CreateLanEventDto, LanEventValidator } from "#/types";
import { getDuplicates } from "#/util";

export const lanDuplicateParticipantValidator: LanEventValidator<number> = {
  validate(errors: string[], event: CreateLanEventDto) {
    const duplicates = getDuplicates(event.participants, (p) => p.userId);
    errors.push(...this.getMessages(duplicates.map((d) => d.userId)));
  },

  getMessages(duplicateUsers: number[]) {
    return duplicateUsers.map((d) => `Participant with user id '${d}' is duplicate`);
  },
};
