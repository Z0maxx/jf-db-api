import { AllOutValidator, CreateAllOutEvent, Schedule, UpdateAllOutEvent } from "#/types";

export const allOutScheduleValidator: AllOutValidator<Schedule> = {
  validate(errors: string[], event: CreateAllOutEvent | UpdateAllOutEvent) {
    const { stage1, stage2, stage3 } = event;
    const schedules = [stage1, stage2, stage3]
      .map((stage, idx) => [
        { name: `Stage ${idx + 1} start time`, time: stage.start },
        { name: `Stage ${idx + 1} end time`, time: stage.end },
      ])
      .flat();

    const invalidSchedules: Schedule[] = [];
    for (let i = 0; i < schedules.length - 1; i++) {
      const before = schedules.slice(i + 1).filter((other) => other.time < schedules[i].time);
      if (before.length > 0) {
        invalidSchedules.push(
          ...before.map((b) => ({ earlier: schedules[i].name, later: b.name })),
        );
      }
    }

    if (invalidSchedules.length > 0) {
      errors.push(...this.getMessages(invalidSchedules));
    }
  },

  getMessages(schedules: Schedule[]) {
    return schedules.map((to) => `${to.later} cannot be earlier than ${to.earlier}`);
  },
};
