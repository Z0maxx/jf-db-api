import { CreateDivisionMapDto } from "#/types";
import { getDuplicates } from "#/util";

import { AllOutEventValidator, CreateAllOutEventDto } from "../all-out.types";

type StageMaps = {
  stage: number;
  maps: CreateDivisionMapDto[];
};

type StageDuplicateMaps = {
  stage: number;
  duplicates: CreateDivisionMapDto[];
};

export const allOutDuplicateMapValidator: AllOutEventValidator<StageDuplicateMaps> = {
  validate(errors: string[], event: CreateAllOutEventDto) {
    const stageMapsList: StageMaps[] = [
      {
        stage: 1,
        maps: event.stage1.maps,
      },
      {
        stage: 2,
        maps: event.stage2.maps,
      },
      {
        stage: 3,
        maps: event.stage3.maps,
      },
    ];

    const duplicateMapsList: StageDuplicateMaps[] = [];
    stageMapsList.forEach((sm) => {
      const duplicates = getDuplicates(sm.maps, (m) => `${m.name}|${m.divisionId}`);
      if (duplicates.length > 0) {
        duplicateMapsList.push({ stage: sm.stage, duplicates });
      }
    });

    errors.push(...this.getMessages(duplicateMapsList));
  },

  getMessages(duplicateMapsList: StageDuplicateMaps[]) {
    return duplicateMapsList
      .map((dm) =>
        dm.duplicates.map(
          (d) =>
            `Stage ${dm.stage} has duplicate map '${d.name}' with division id '${d.divisionId}'`,
        ),
      )
      .flat();
  },
};
