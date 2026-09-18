import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { AllOutValidator, CreateAllOutEvent, UpdateAllOutEvent } from "#/types";

type StageDateFields = {
  stage: number;
  dateFields: {
    originalDate?: Date | undefined;
    date: Date;
    name: string;
  }[];
};

type StageInvalidDateFields = {
  stage: number;
  invalidDateFields: string[];
};

export const allOutPastDatesValidator: AllOutValidator<StageInvalidDateFields> = {
  validate(
    errors: string[],
    event: CreateAllOutEvent | UpdateAllOutEvent,
    originalEvent?: AllOutEvent,
  ) {
    const dateFieldsList: StageDateFields[] = [
      {
        stage: 1,
        dateFields: [
          {
            originalDate: originalEvent?.stage1Start,
            date: event.stage1.start,
            name: "start",
          },
          {
            originalDate: originalEvent?.stage1End,
            date: event.stage1.end,
            name: "end",
          },
        ],
      },
      {
        stage: 2,
        dateFields: [
          {
            originalDate: originalEvent?.stage2Start,
            date: event.stage2.start,
            name: "start",
          },
          {
            originalDate: originalEvent?.stage2End,
            date: event.stage2.end,
            name: "end",
          },
        ],
      },
      {
        stage: 3,
        dateFields: [
          {
            originalDate: originalEvent?.stage3Start,
            date: event.stage3.start,
            name: "start",
          },
          {
            originalDate: originalEvent?.stage3End,
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
      .map((df) => df.invalidDateFields.map((f) => `Stage ${df.stage} ${f} cannot be in the past`))
      .flat();
  },
};

function getInvalidDateFields(dateFieldsList: StageDateFields[]): StageInvalidDateFields[] {
  const now = new Date();
  const invalidDateFieldsList: StageInvalidDateFields[] = [];
  dateFieldsList.forEach((df) => {
    const invalidDateFields: string[] = [];
    df.dateFields.forEach((f) => {
      if (
        (f.originalDate && f.originalDate < now && f.originalDate > f.date) ||
        (!f.originalDate && f.date < now)
      ) {
        invalidDateFields.push(f.name);
      }
    });

    if (invalidDateFields.length > 0) {
      invalidDateFieldsList.push({ stage: df.stage, invalidDateFields });
    }
  });

  return invalidDateFieldsList;
}
