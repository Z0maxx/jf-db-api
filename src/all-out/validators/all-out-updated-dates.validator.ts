import { AllOutEvent } from "#/db-entities/AllOutEvent";
import {
  AllOutValidator,
  CreateAllOutEventDto,
  StageInvalidDateFields,
  UpdateAllOutEventDto,
} from "#/types";

type UpdatedDateFields = {
  stage: number;
  dateFields: {
    originalDate: Date;
    date: Date;
    name: string;
  }[];
};

export const allOutUpdatedDatesValidator: AllOutValidator<StageInvalidDateFields> = {
  validate(
    errors: string[],
    event: CreateAllOutEventDto | UpdateAllOutEventDto,
    originalEvent?: AllOutEvent,
  ) {
    const dateFieldsList: UpdatedDateFields[] = [
      {
        stage: 1,
        dateFields: [
          {
            originalDate: originalEvent!.stage1Start,
            date: event.stage1.start,
            name: "start",
          },
          {
            originalDate: originalEvent!.stage1End,
            date: event.stage1.end,
            name: "end",
          },
        ],
      },
      {
        stage: 2,
        dateFields: [
          {
            originalDate: originalEvent!.stage2Start,
            date: event.stage2.start,
            name: "start",
          },
          {
            originalDate: originalEvent!.stage2End,
            date: event.stage2.end,
            name: "end",
          },
        ],
      },
      {
        stage: 3,
        dateFields: [
          {
            originalDate: originalEvent!.stage3Start,
            date: event.stage3.start,
            name: "start",
          },
          {
            originalDate: originalEvent!.stage3End,
            date: event.stage3.end,
            name: "end",
          },
        ],
      },
    ];

    errors.push(...this.getMessages(getInvalidDateFields(dateFieldsList)));
  },

  getMessages(invalidDateFieldsList: StageInvalidDateFields[]) {
    return invalidDateFieldsList
      .map((df) =>
        df.invalidDateFields.map(
          (f) => `Stage ${df.stage} ${f} must be the same as current ${f} or be in the future`,
        ),
      )
      .flat();
  },
};

function getInvalidDateFields(dateFieldsList: UpdatedDateFields[]): StageInvalidDateFields[] {
  const now = new Date();
  const invalidDateFieldsList: StageInvalidDateFields[] = [];
  dateFieldsList.forEach((df) => {
    const invalidDateFields = df.dateFields
      .filter((f) => f.originalDate && f.originalDate < now && f.originalDate > f.date)
      .map((f) => f.name);

    if (invalidDateFields.length > 0) {
      invalidDateFieldsList.push({ stage: df.stage, invalidDateFields });
    }
  });

  return invalidDateFieldsList;
}
