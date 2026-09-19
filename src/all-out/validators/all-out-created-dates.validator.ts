import {
  AllOutValidator,
  CreateAllOutEvent,
  StageInvalidDateFields,
  UpdateAllOutEvent,
} from "#/types";

type CreatedDateFields = {
  stage: number;
  dateFields: {
    date: Date;
    name: string;
  }[];
};

export const allOutCreatedDatesValidator: AllOutValidator<StageInvalidDateFields> = {
  validate(errors: string[], event: CreateAllOutEvent | UpdateAllOutEvent) {
    const dateFieldsList: CreatedDateFields[] = [
      {
        stage: 1,
        dateFields: [
          {
            date: event.stage1.start,
            name: "start",
          },
          {
            date: event.stage1.end,
            name: "end",
          },
        ],
      },
      {
        stage: 2,
        dateFields: [
          {
            date: event.stage2.start,
            name: "start",
          },
          {
            date: event.stage2.end,
            name: "end",
          },
        ],
      },
      {
        stage: 3,
        dateFields: [
          {
            date: event.stage3.start,
            name: "start",
          },
          {
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

function getInvalidDateFields(dateFieldsList: CreatedDateFields[]): StageInvalidDateFields[] {
  const now = new Date();
  const invalidDateFieldsList: StageInvalidDateFields[] = [];
  dateFieldsList.forEach((df) => {
    const invalidDateFields = df.dateFields.filter((f) => f.date < now).map((f) => f.name);
    if (invalidDateFields.length > 0) {
      invalidDateFieldsList.push({ stage: df.stage, invalidDateFields });
    }
  });

  return invalidDateFieldsList;
}
