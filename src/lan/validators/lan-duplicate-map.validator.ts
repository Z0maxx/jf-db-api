import { LanMapType, TLanMapType } from "#/db-entities/LanMap";
import { getDuplicates } from "#/util";

import { LanEventValidator, CreateLanEventDto } from "../lan.types";

type LanDuplicateMaps = {
  type: TLanMapType;
  duplicates: string[];
};

export const lanDuplicateMapValidator: LanEventValidator<LanDuplicateMaps> = {
  validate(errors: string[], event: CreateLanEventDto) {
    const soldierDuplicates = getDuplicates(event.maps.soldier, (m) => m);
    const demomanDuplicates = getDuplicates(event.maps.demoman, (m) => m);
    errors.push(
      ...this.getMessages([
        {
          type: LanMapType.SOLDIER,
          duplicates: soldierDuplicates,
        },
        {
          type: LanMapType.DEMOMAN,
          duplicates: demomanDuplicates,
        },
      ]),
    );
  },

  getMessages(duplicateMapsList: LanDuplicateMaps[]) {
    return duplicateMapsList
      .map((dm) => dm.duplicates.map((m) => `${dm.type} map '${m}' is duplicate`))
      .flat();
  },
};
