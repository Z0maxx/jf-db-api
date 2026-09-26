import { ctx } from "#/db-context";
import { AllOutEvent } from "#/db-entities/AllOutEvent";
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
import { transformDbMaps } from "#/helpers/map.helper";
import { steamUsersService } from "#/steam/steam-users.service";
import {
  AllOutEventPreviewDto,
  AllOutValidator,
  CreateAllOutEventDto,
  LapLeaderboardItemDto,
  LeaderboardItemDto,
  LeaderboardQuery,
  ParticipantDto,
  Registration,
  RegistrationDetails,
  UpdateAllOutEventDto,
} from "#/types";

import { allOutRepository } from "./all-out.repository";
import { allOutCreatedDatesValidator } from "./validators/all-out-created-dates.validator";
import { allOutDuplicateMapValidator } from "./validators/all-out-duplicate-map.validator";
import { allOutScheduleValidator } from "./validators/all-out-schedule.validator";
import { allOutUpdatedDatesValidator } from "./validators/all-out-updated-dates.validator";

export const allOutService = {
  async getEventByIdAsync(eventId: number) {
    const event = await allOutRepository.getEventByIdAsync(eventId);
    if (!event) {
      throw new EventNotFoundError(eventId);
    }

    return event;
  },

  async getEventDetailsAsync(eventId: number) {
    const event = await this.getEventByIdAsync(eventId);
    const stage1Maps = transformDbMaps(
      event.allOutStage1MapCollection,
      ({ id, name, timeLimit, division }) => ({
        id,
        name,
        timeLimit,
        division: {
          name: division.$.name,
          type: division.$.type,
          color: division.$.color,
        },
      }),
    );

    const stage2Maps = transformDbMaps(
      event.allOutStage2MapCollection,
      ({ id, name, division }) => ({
        id,
        name,
        division: {
          name: division.$.name,
          type: division.$.type,
          color: division.$.color,
        },
      }),
    );

    const stage3Maps = transformDbMaps(
      event.allOutStage3MapCollection,
      ({ id, name, division }) => ({
        id,
        name,
        division: {
          name: division.$.name,
          type: division.$.type,
          color: division.$.color,
        },
      }),
    );

    return {
      id: event.id,
      canceled: event.canceled,
      description: event.description,
      stage1: {
        description: event.stage1Description,
        start: event.stage1Start,
        end: event.stage1End,
        maps: stage1Maps,
      },
      stage2: {
        description: event.stage2Description,
        start: event.stage2Start,
        end: event.stage2End,
        maps: stage2Maps,
      },
      stage3: {
        description: event.stage3Description,
        start: event.stage3Start,
        end: event.stage3End,
        maps: stage3Maps,
      },
    };
  },

  async getAllEventPreviewsAsync(): Promise<AllOutEventPreviewDto[]> {
    const events = await allOutRepository.getAllEventsAsync();
    return events.map(({ id, canceled, stage1Start, stage3End }) => ({
      id,
      canceled,
      start: stage1Start,
      end: stage3End,
    }));
  },

  async getAllEventParticipantsAsync(eventId: number): Promise<ParticipantDto[]> {
    await this.getEventByIdAsync(eventId);
    const participants = await allOutRepository.getAllEventParticipantsAsync(eventId);
    const users = await steamUsersService.getUsersAsync(
      participants.map((p) => p.user.$.steam64Id),
    );
    return participants.map((p) => ({
      id: p.id,
      resigned: p.resigned,
      ...users.get(p.user.$.steam64Id)!,
      divisions: p.divisionCollection.$.map(({ type, name, color }) => ({
        type,
        name,
        color,
      })),
    }));
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery): Promise<LeaderboardItemDto[]> {
    await checkStage1MapExistsAsync(query.mapId);
    const items = await allOutRepository.getStage1LeaderboardAsync(query);
    const users = await steamUsersService.getUsersAsync(
      items.map((i) => i.participant.$.user.$.steam64Id),
    );
    return items.map((i) => ({
      id: i.id,
      user: users.get(i.participant.$.user.$.steam64Id)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
    }));
  },

  async getStage2LeaderboardAsync(query: LeaderboardQuery): Promise<LapLeaderboardItemDto[]> {
    await checkStage2MapExistsAsync(query.mapId);
    const items = await allOutRepository.getStage2LeaderboardAsync(query);
    const users = await steamUsersService.getUsersAsync(
      items.map((i) => i.participant.$.user.$.steam64Id),
    );

    return items.map((i) => ({
      id: i.id,
      user: users.get(i.participant.$.user.$.steam64Id)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
      lap: {
        count: i.lapCount,
        lastTimestamp: i.lastLapTimestamp,
      },
    }));
  },

  async getStage3LeaderboardAsync(query: LeaderboardQuery): Promise<LeaderboardItemDto[]> {
    await checkStage3MapExistsAsync(query.mapId);
    const items = await allOutRepository.getStage3LeaderboardAsync(query);
    const users = await steamUsersService.getUsersAsync(
      items.map((i) => i.participant.$.user.$.steam64Id),
    );
    return items.map((i) => ({
      id: i.id,
      user: users.get(i.participant.$.user.$.steam64Id)!,
      pr: {
        seconds: i.prSeconds,
        timestamp: i.prTimestamp,
      },
    }));
  },

  async getRegistrationDetailsAsync(registration: Registration): Promise<RegistrationDetails> {
    await this.getEventByIdAsync(registration.eventId);
    const participant = await allOutRepository.getParticipantAsync(
      registration.eventId,
      registration.userId,
    );
    return {
      registered: !!participant,
      resigned: participant ? participant.resigned : false,
    };
  },

  async createEventAsync(event: CreateAllOutEventDto) {
    validate(
      [allOutDuplicateMapValidator, allOutCreatedDatesValidator, allOutScheduleValidator],
      event,
    );

    await checkEventDivisionsExistAsync(event);
    const id = await allOutRepository.createEventAsync(event);
    return await this.getEventDetailsAsync(id);
  },

  async updateEventAsync(event: UpdateAllOutEventDto) {
    const originalEvent = await this.getEventByIdAsync(event.id);
    validate(
      [allOutDuplicateMapValidator, allOutUpdatedDatesValidator, allOutScheduleValidator],
      event,
      originalEvent,
    );

    await checkEventDivisionsExistAsync(event);
    await allOutRepository.updateEventAsync(event);
    return await this.getEventDetailsAsync(event.id);
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
    checkEventNotEnded(event);
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

async function checkEventDivisionsExistAsync(event: CreateAllOutEventDto | UpdateAllOutEventDto) {
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
  event: CreateAllOutEventDto | UpdateAllOutEventDto,
  originalEvent?: AllOutEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, originalEvent));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
