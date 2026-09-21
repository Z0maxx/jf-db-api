import {
  AllOutValidator,
  CreateAllOutEventDto,
  CreateEventMapDto,
  UpdateAllOutEventDto,
} from "#/types";
import { getDuplicates } from "#/util";

type StageMaps = {
  stage: number;
  maps: CreateEventMapDto[];
};

type StageDuplicateMaps = {
  stage: number;
  duplicates: CreateEventMapDto[];
};

export const allOutDuplicateMapValidator: AllOutValidator<StageDuplicateMaps> = {
  validate(errors: string[], event: CreateAllOutEventDto | UpdateAllOutEventDto) {
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
