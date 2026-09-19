import {
  AllOutValidator,
  CreateAllOutEvent,
  LeaderboardQuery,
  Registration,
  UpdateAllOutEvent,
} from "#/types";
import { allOutRepository } from "./all-out.repository";
import {
  AlreadyRegisteredError,
  DivisionsNotFoundError,
  EventEndedError,
  EventNotFoundError,
  EventStartedInPastError,
  MapNotFoundError,
  NoMapsWithUserDivisionsError,
  RegistrationNotFoundError,
  ValidationError,
} from "#/errors";
import { ctx } from "#/db-context";
import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { allOutDuplicateMapValidator } from "./validators/all-out-duplicate-map.validator";
import { allOutScheduleValidator } from "./validators/all-out-schedule.validator";
import { allOutCreatedDatesValidator } from "./validators/all-out-created-dates.validator";
import { allOutUpdatedDatesValidator } from "./validators/all-out-updated-dates.validator";

export const allOutService = {
  async getEventByIdAsync(
    eventId: number,
    options: { populateMaps: boolean } = { populateMaps: false },
  ) {
    const event = await allOutRepository.getEventByIdAsync(eventId, options);
    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    return event;
  },

  async getEventDetailsAsync(eventId: number) {
    await this.getEventByIdAsync(eventId);
    return await allOutRepository.getEventDetailsAsync(eventId);
  },

  async getAllEventParticipantsAsync(eventId: number) {
    await this.getEventByIdAsync(eventId);
    return await allOutRepository.getAllEventParticipantsAsync(eventId);
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery) {
    await checkStage1MapExistsAsync(query.mapId);
    return await allOutRepository.getStage1LeaderboardAsync(query);
  },

  async getStage2LeaderboardAsync(query: LeaderboardQuery) {
    await checkStage2MapExistsAsync(query.mapId);
    return await allOutRepository.getStage2LeaderboardAsync(query);
  },

  async getStage3LeaderboardAsync(query: LeaderboardQuery) {
    await checkStage3MapExistsAsync(query.mapId);
    return await allOutRepository.getStage3LeaderboardAsync(query);
  },

  async getRegistrationDetailsAsync(registration: Registration) {
    await this.getEventByIdAsync(registration.eventId);
    return await allOutRepository.getRegistrationDetailsAsync(registration);
  },

  async createEventAsync(event: CreateAllOutEvent) {
    await checkEventDivisionsExistAsync(event);
    validate(
      [allOutDuplicateMapValidator, allOutCreatedDatesValidator, allOutScheduleValidator],
      event,
    );

    return await allOutRepository.createEventAsync(event);
  },

  async updateEventAsync(event: UpdateAllOutEvent) {
    const originalEvent = await this.getEventByIdAsync(event.id);
    validate(
      [allOutDuplicateMapValidator, allOutUpdatedDatesValidator, allOutScheduleValidator],
      event,
      originalEvent,
    );

    await checkEventDivisionsExistAsync(event);
    return await allOutRepository.updateEventAsync(event);
  },

  async registerAsync(registration: Registration) {
    const event = await this.getEventByIdAsync(registration.eventId);
    checkEventNotStartedInPast(event);
    await checkUserHasEventDivisionsAsync(event, registration.userId);
    await checkNotAlreadyRegisteredAsync(registration);
    await allOutRepository.registerAsync(registration);
  },

  async resignOrDeleteRegistrationAsync(registration: Registration) {
    const event = await this.getEventByIdAsync(registration.eventId);
    await checkRegistrationExistsAsync(registration);
    checkEventNotEnded(event);
    const now = new Date();
    if (event.stage1Start <= now) {
      await allOutRepository.resignAsync(registration);
    } else {
      await allOutRepository.deleteRegistrationAsync(registration);
    }
  },

  async deleteEventAsync(eventId: number) {
    const event = await this.getEventByIdAsync(eventId);
    checkEventNotStartedInPast(event);
    await allOutRepository.deleteEventAsync(event);
  },

  async cancelEventAsync(eventId: number) {
    const event = await this.getEventByIdAsync(eventId);
    checkEventNotEnded(event)
    await allOutRepository.cancelEventAsync(event);
  },
};

async function checkRegistrationExistsAsync(registration: Registration) {
  if (!(await allOutRepository.registrationExistsAsync(registration))) {
    throw new RegistrationNotFoundError(registration);
  }
}

async function checkUserHasEventDivisionsAsync(event: AllOutEvent, userId: number) {
  if (!(await allOutRepository.userHasEventDivisionsAsync(event.id, userId))) {
    throw new NoMapsWithUserDivisionsError(event.id, userId);
  }
}

async function checkNotAlreadyRegisteredAsync(registration: Registration) {
  if (await allOutRepository.registrationExistsAsync(registration)) {
    throw new AlreadyRegisteredError(registration);
  }
}

async function checkStage1MapExistsAsync(mapId: number) {
  if (!(await allOutRepository.stage1MapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkStage2MapExistsAsync(mapId: number) {
  if (!(await allOutRepository.stage2MapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkStage3MapExistsAsync(mapId: number) {
  if (!(await allOutRepository.stage3MapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkEventDivisionsExistAsync(event: CreateAllOutEvent | UpdateAllOutEvent) {
  const divisionIds = Array.from(
    new Set([
      ...event.stage1.maps.map((m) => m.divisionId),
      ...event.stage2.maps.map((m) => m.divisionId),
      ...event.stage3.maps.map((m) => m.divisionId),
    ]),
  );

  const exisitingDivisions = await ctx.divisions.find({ id: { $in: divisionIds } });
  if (exisitingDivisions.length !== divisionIds.length) {
    throw new DivisionsNotFoundError(
      divisionIds.filter((dId) => !exisitingDivisions.some((e) => e.id === dId)),
    );
  }
}

function checkEventNotStartedInPast(event: AllOutEvent) {
  const now = new Date();
  if (event.stage1Start <= now) {
    throw new EventStartedInPastError(event.id, event.stage1Start);
  }
}

function checkEventNotEnded(event: AllOutEvent) {
  const now = new Date();
  if (event.stage3End <= now) {
    throw new EventEndedError(event.id, event.stage3End);
  }
}

function validate(
  validators: AllOutValidator<any>[],
  event: CreateAllOutEvent | UpdateAllOutEvent,
  originalEvent?: AllOutEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, originalEvent));

  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
