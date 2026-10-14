import { getDuplicates } from "#/util";

import { LanEventValidator, CreateLanEventDto } from "../lan.types";

export const lanDuplicateParticipantAliasValidator: LanEventValidator<string> = {
  validate(errors: string[], event: CreateLanEventDto) {
    const duplicates = getDuplicates(
      event.participants.filter((p) => p.alias),
      (p) => p.alias!,
    );
    errors.push(...this.getMessages(duplicates.map((d) => d.alias!)));
  },

  getMessages(duplicateAliases: string[]) {
    return duplicateAliases.map((d) => `Participant alias '${d}' is duplicate`);
  },
};
