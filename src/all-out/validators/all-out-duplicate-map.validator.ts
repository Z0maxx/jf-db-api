import { AllOutValidator, CreateAllOutEvent, CreateEventMap, UpdateAllOutEvent } from "#/types";

type StageMaps = {
  stage: number;
  maps: CreateEventMap[];
};

type StageDuplicateMaps = {
  stage: number;
  duplicates: CreateEventMap[];
};

export const allOutDuplicateMapValidator: AllOutValidator<StageDuplicateMaps> = {
  validate(errors: string[], event: CreateAllOutEvent | UpdateAllOutEvent) {
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

    errors.push(...this.getMessages(getDuplicateMaps(stageMapsList)));
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

function getDuplicateMaps(stageMapsList: StageMaps[]) {
  const duplicateMapsList: StageDuplicateMaps[] = [];
  stageMapsList.forEach((sm) => {
    const mapGroups = Object.groupBy(sm.maps, (m) => `${m.name}|${m.divisionId}`);

    const duplicates = Object.entries(mapGroups)
      .filter((g) => g[1]!.length > 1)
      .map((e) => e[1]![0]);

    if (duplicates.length > 0) {
      duplicateMapsList.push({ stage: sm.stage, duplicates });
    }
  });

  return duplicateMapsList;
}
