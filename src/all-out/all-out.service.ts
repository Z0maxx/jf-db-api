import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { AllOutStage1Map } from "#/db-entities/AllOutStage1Map";
import { AllOutStage2Map } from "#/db-entities/AllOutStage2Map";
import { AllOutStage3Map } from "#/db-entities/AllOutStage3Map";
import { DivisionType } from "#/db-entities/Division";
import { DivisionsNotFoundError } from "#/divisions/divisions.errors";
import { divisionsRepository } from "#/divisions/divisions.repository";
import {
  AlreadyRegisteredError,
  EventEndedError,
  EventNotFoundError,
  EventStartedInPastError,
  MapNotFoundError,
  NoMapsWithUserDivisionsError,
  RegistrationNotFoundError,
  ValidationError,
} from "#/errors";
import { steamService } from "#/steam/steam.service";
import {
  DivisionMapDto,
  LapLeaderboardItemDto,
  LeaderboardItemDto,
  LeaderboardQuery,
  LoadedUser,
  MapsDto,
  ParticipantDto,
  Registration,
  RegistrationDetails,
} from "#/types";
import { getUserDivisionDtos } from "#/util";
import { Loaded, Collection } from "@mikro-orm/core";

import { allOutRepository } from "./all-out.repository";
import { AllOutEventPreviewDto, CreateAllOutEventDto, AllOutEventValidator } from "./all-out.types";
import { allOutCreatedDateValidator } from "./validators/all-out-created-date.validator";
import { allOutScheduleValidator } from "./validators/all-out-schedule.validator";
import { allOutUniqueMapValidator } from "./validators/all-out-unique-map.validator";
import { allOutUpdatedDateValidator } from "./validators/all-out-updated-date.validator";

export const allOutService = {
  async getEventDetailsAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId);
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
    await getEventByIdAsync(eventId);
    const participants = await allOutRepository.getAllEventParticipantsAsync(eventId);
    const users = await steamService.getUsersAsync(participants.map((p) => p.user.$.steam64Id));
    return participants.map((p) => ({
      id: p.id,
      resigned: p.resigned,
      ...users.get(p.user.$.steam64Id)!,
      ...getUserDivisionDtos(p),
    }));
  },

  async getStage1LeaderboardAsync(query: LeaderboardQuery): Promise<LeaderboardItemDto[]> {
    await checkStage1MapExistsAsync(query.mapId);
    const items = await allOutRepository.getStage1LeaderboardAsync(query);
    const users = await steamService.getUsersAsync(
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
    const users = await steamService.getUsersAsync(
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
    const users = await steamService.getUsersAsync(
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
    await getEventByIdAsync(registration.eventId);
    const participant = await allOutRepository.getParticipantAsync(
      registration.eventId,
      registration.user,
    );

    return {
      registered: !!participant,
      resigned: participant ? participant.resigned : false,
    };
  },

  async createEventAsync(event: CreateAllOutEventDto) {
    validate(
      [allOutUniqueMapValidator, allOutCreatedDateValidator, allOutScheduleValidator],
      event,
    );

    await checkEventDivisionsExistAsync(event);
    const id = await allOutRepository.createEventAsync(event);
    return await this.getEventDetailsAsync(id);
  },

  async updateEventAsync(eventId: number, event: CreateAllOutEventDto) {
    const originalEvent = await getEventByIdAsync(eventId);
    validate(
      [allOutUniqueMapValidator, allOutUpdatedDateValidator, allOutScheduleValidator],
      event,
      originalEvent,
    );

    await checkEventDivisionsExistAsync(event);
    await allOutRepository.updateEventAsync(originalEvent, event);
    return await this.getEventDetailsAsync(eventId);
  },

  async registerAsync(registration: Registration) {
    const event = await getEventByIdAsync(registration.eventId);
    checkEventNotStartedInPast(event);
    await checkUserHasEventDivisionsAsync(event, registration.user);
    await checkNotAlreadyRegisteredAsync(registration);
    await allOutRepository.registerAsync(registration);
  },

  async resignOrDeleteRegistrationAsync(registration: Registration) {
    const event = await getEventByIdAsync(registration.eventId);
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
    const event = await getEventByIdAsync(eventId);
    checkEventNotStartedInPast(event);
    await allOutRepository.deleteEventAsync(event);
  },

  async cancelEventAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId);
    checkEventNotEnded(event);
    await allOutRepository.cancelEventAsync(event);
  },
};

async function getEventByIdAsync(eventId: number) {
  const event = await allOutRepository.getEventByIdAsync(eventId);
  if (!event) {
    throw new EventNotFoundError(eventId);
  }

  return event;
}

async function checkRegistrationExistsAsync(registration: Registration) {
  if (!(await allOutRepository.registrationExistsAsync(registration))) {
    throw new RegistrationNotFoundError(registration);
  }
}

async function checkUserHasEventDivisionsAsync(event: AllOutEvent, user: LoadedUser) {
  if (!(await allOutRepository.userHasEventDivisionsAsync(event.id, user))) {
    throw new NoMapsWithUserDivisionsError(event.id, user.id);
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

async function checkEventDivisionsExistAsync(event: CreateAllOutEventDto) {
  const divisionIds = Array.from(
    new Set([
      ...event.stage1.maps.map((m) => m.divisionId),
      ...event.stage2.maps.map((m) => m.divisionId),
      ...event.stage3.maps.map((m) => m.divisionId),
    ]),
  );

  const exisitingDivisions = await divisionsRepository.getDivisionsByIdsAsync(divisionIds);
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
  validators: AllOutEventValidator<any>[],
  event: CreateAllOutEventDto,
  originalEvent?: AllOutEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, originalEvent));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

function transformDbMaps<
  TDbMap extends Loaded<AllOutStage1Map | AllOutStage2Map | AllOutStage3Map, "division">,
  TMap extends DivisionMapDto,
>(maps: Collection<TDbMap>, transformFn: (map: TDbMap) => TMap) {
  return {
    soldier: maps.filter((m) => m.division.$.type === DivisionType.SOLDIER).map(transformFn),
    demoman: maps.filter((m) => m.division.$.type === DivisionType.DEMOMAN).map(transformFn),
  } as MapsDto<TMap>;
}
