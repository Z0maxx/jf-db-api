import crypto from "node:crypto";

import { Division } from "#/db-entities/Division";
import { MonthlyEvent } from "#/db-entities/MonthlyEvent";
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
import { tempusService } from "#/tempus/tempus.service";
import { LeaderboardQuery, LoadedUser, Registration, RegistrationDetails } from "#/types";

import { monthliesRepository } from "./monthlies.repository";
import {
  CreateMonthlyEventDto,
  MonthlyEventDetailsDto,
  MonthlyEventPreviewDto,
  MonthlyEventValidator,
  MonthlyLeaderboardItemDto,
  MonthlyLeaderboardSubscriber,
  MonthlyParticipantDto,
  MonthlyTimeSubmissionDto,
  MonthlyTimeSubmissionResult,
} from "./monthlies.types";
import { monthlyCreatedDateValidator } from "./validators/monthly-created-date.validator";
import { monthlyDivisionSingleMapValidator } from "./validators/monthly-division-single-map.validator";
import { monthlyDivisionTypeValidator } from "./validators/monthly-division-type.validator";
import { monthlyScheduleValidator } from "./validators/monthly-schedule.validator";
import { monthlyUpdatedDateValidator } from "./validators/monthly-updated-date.validator";

const leaderboardSubscribers: MonthlyLeaderboardSubscriber[] = [];
const leaderboardCache = new Map<number, MonthlyLeaderboardItemDto[]>();

export const monthliesService = {
  async getEventDetailsAsync(eventId: number): Promise<MonthlyEventDetailsDto> {
    const event = await getEventByIdAsync(eventId);
    return {
      id: event.id,
      type: event.type,
      canceled: event.canceled,
      description: event.description,
      start: event.start,
      end: event.end,
      maps: event.monthlyMapCollection.$.map(({ id, name, division }) => ({
        id,
        name,
        division: {
          name: division.$.name,
          color: division.$.color,
        },
      })),
    };
  },

  async getAllEventPreviewsAsync(): Promise<MonthlyEventPreviewDto[]> {
    const events = await monthliesRepository.getAllEventsAsync();
    return events.map(({ id, type, description, start, end, canceled }) => ({
      id,
      type,
      description,
      start,
      end,
      canceled,
    }));
  },

  async getAllEventParticipantsAsync(eventId: number): Promise<MonthlyParticipantDto[]> {
    await getEventByIdAsync(eventId);
    const participants = await monthliesRepository.getAllEventParticipantsAsync(eventId);
    const users = await steamService.getUsersAsync(participants.map((p) => p.user.$.steam64Id));
    return participants.map((p) => ({
      id: p.id,
      resigned: p.resigned,
      division: {
        name: p.division.$.name,
        color: p.division.$.color,
      },
      ...users.get(p.user.$.steam64Id)!,
    }));
  },

  async getRegistrationDetailsAsync(registration: Registration): Promise<RegistrationDetails> {
    await getEventByIdAsync(registration.eventId);
    const participant = await monthliesRepository.getParticipantAsync(
      registration.eventId,
      registration.user,
    );

    return {
      registered: !!participant,
      resigned: participant ? participant.resigned : false,
    };
  },

  async subscribeToLeaderboardAsync(
    mapId: number,
    callback: (items: MonthlyLeaderboardItemDto[]) => void,
  ) {
    await checkMapExistsAsync(mapId);
    const subscriberId = crypto.randomUUID();
    const handler = () => {
      callback(leaderboardCache.get(mapId)!);
    };

    leaderboardSubscribers.push({
      id: subscriberId,
      handler,
    });

    if (!leaderboardCache.has(mapId)) {
      updateLeaderboardCacheAsync(mapId);
    } else {
      handler();
    }

    return subscriberId;
  },

  unsubscribeFromLeaderboard(subscriberId: string) {
    const idx = leaderboardSubscribers.findIndex((s) => s.id === subscriberId);
    if (idx > -1) {
      leaderboardSubscribers.splice(idx, 1);
    }
  },

  async createEventAsync(event: CreateMonthlyEventDto) {
    const divisions = await getDivisionsAsync(event);
    validate(
      [
        monthlyDivisionSingleMapValidator,
        monthlyCreatedDateValidator,
        monthlyScheduleValidator,
        monthlyDivisionTypeValidator,
      ],
      event,
      divisions,
    );

    const id = await monthliesRepository.createEventAsync(event);
    return await this.getEventDetailsAsync(id);
  },

  async updateEventAsync(eventId: number, event: CreateMonthlyEventDto) {
    const originalEvent = await getEventByIdAsync(eventId);
    const divisions = await getDivisionsAsync(event);
    validate(
      [
        monthlyDivisionSingleMapValidator,
        monthlyUpdatedDateValidator,
        monthlyScheduleValidator,
        monthlyDivisionTypeValidator,
      ],
      event,
      divisions,
      originalEvent,
    );

    await monthliesRepository.updateEventAsync(originalEvent, event);
    return await this.getEventDetailsAsync(eventId);
  },

  async submitTimeAsync(
    user: LoadedUser,
    submission: MonthlyTimeSubmissionDto,
  ): Promise<MonthlyTimeSubmissionResult> {
    const event = await getEventByIdAsync(submission.eventId);
    const participant = await getParticipantAsync({ eventId: submission.eventId, user });
    const map = event.monthlyMapCollection.$.find(
      (m) => m.division.$.id === participant.division.id,
    )!;

    const completion = await tempusService.getCompletionAsync({
      type: event.type,
      tempusId: user.tempusId!,
      mapName: map.name,
    });

    if (!completion) {
      return getTimeSubmissionResult("rejected", "Tempus record not found for map");
    }

    if (submission.timeSeconds === undefined) {
      if (completion.prTimestamp < event.start) {
        return getTimeSubmissionResult(
          "rejected",
          "Tempus record is older than event's start time",
        );
      } else if (completion.prTimestamp > event.end) {
        return getTimeSubmissionResult("rejected", "Tempus record is after event's end time");
      }

      await monthliesRepository.setLeaderboardItemAsync({
        verified: true,
        map,
        participant,
        ...completion,
      });

      updateLeaderboardCacheAsync(map.id);
      return getTimeSubmissionResult("verified", "Tempus record successfully verified");
    } else {
      if (completion.prSeconds > submission.timeSeconds) {
        return getTimeSubmissionResult("rejected", "Tempus record is slower than submitted time");
      }

      await monthliesRepository.setLeaderboardItemAsync({
        verified: false,
        map,
        participant,
        prSeconds: submission.timeSeconds,
        prTimestamp: new Date(),
      });

      updateLeaderboardCacheAsync(map.id);
      return getTimeSubmissionResult("accepted", "Accepted submitted time");
    }
  },

  async registerAsync(registration: Registration) {
    const event = await getEventByIdAsync(registration.eventId);
    checkEventNotEnded(event);
    await checkNotAlreadyRegisteredAsync(registration);
    await checkUserHasEventDivisionsAsync(event, registration.user);
    await monthliesRepository.registerAsync(registration);
  },

  async resignOrDeleteRegistrationAsync(registration: Registration) {
    const event = await getEventByIdAsync(registration.eventId);
    await checkRegistrationExistsAsync(registration);
    checkEventNotEnded(event);
    const now = new Date();
    if (event.start <= now) {
      await monthliesRepository.resignAsync(registration);
    } else {
      await monthliesRepository.deleteRegistrationAsync(registration);
    }
  },

  async deleteEventAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId);
    checkEventNotStartedInPast(event);
    await monthliesRepository.deleteEventAsync(event);
  },

  async cancelEventAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId);
    checkEventNotEnded(event);
    await monthliesRepository.cancelEventAsync(event);
  },
};

async function getEventByIdAsync(eventId: number) {
  const event = await monthliesRepository.getEventByIdAsync(eventId);
  if (!event) {
    throw new EventNotFoundError(eventId);
  }

  return event;
}

async function getParticipantAsync(registration: Registration) {
  const participant = await monthliesRepository.getParticipantAsync(
    registration.eventId,
    registration.user,
  );
  if (!participant) {
    throw new RegistrationNotFoundError(registration);
  }

  return participant;
}

async function checkMapExistsAsync(mapId: number) {
  if (!(await monthliesRepository.mapExistsAsync(mapId))) {
    throw new MapNotFoundError(mapId);
  }
}

async function checkRegistrationExistsAsync(registration: Registration) {
  if (!(await monthliesRepository.registrationExistsAsync(registration))) {
    throw new RegistrationNotFoundError(registration);
  }
}

async function checkUserHasEventDivisionsAsync(event: MonthlyEvent, user: LoadedUser) {
  if (!(await monthliesRepository.userHasEventDivisionsAsync(event.id, user))) {
    throw new NoMapsWithUserDivisionsError(event.id, user.id);
  }
}

async function checkNotAlreadyRegisteredAsync(registration: Registration) {
  if (await monthliesRepository.registrationExistsAsync(registration)) {
    throw new AlreadyRegisteredError(registration);
  }
}

async function getDivisionsAsync(event: CreateMonthlyEventDto) {
  const divisionIds = Array.from(new Set(event.maps.map((m) => m.divisionId)));
  const exisitingDivisions = await divisionsRepository.getDivisionsByIdsAsync(divisionIds);
  if (exisitingDivisions.length !== divisionIds.length) {
    throw new DivisionsNotFoundError(
      divisionIds.filter((dId) => !exisitingDivisions.some((e) => e.id === dId)),
    );
  }

  return exisitingDivisions;
}

function checkEventNotStartedInPast(event: MonthlyEvent) {
  const now = new Date();
  if (event.start <= now) {
    throw new EventStartedInPastError(event.id, event.start);
  }
}

function checkEventNotEnded(event: MonthlyEvent) {
  const now = new Date();
  if (event.end <= now) {
    throw new EventEndedError(event.id, event.end);
  }
}

async function updateLeaderboardCacheAsync(mapId: number) {
  const items = await monthliesRepository.getLeaderboardAsync(mapId);
  const users = await steamService.getUsersAsync(
    items.map((i) => i.participant.$.user.$.steam64Id),
  );
  const dtos = items.map((i) => ({
    id: i.id,
    user: users.get(i.participant.$.user.$.steam64Id)!,
    pr: {
      verified: i.verified,
      seconds: i.prSeconds,
      timestamp: i.prTimestamp,
    },
  }));

  let cacheItems = leaderboardCache.get(mapId);
  if (!cacheItems) {
    cacheItems = [];
    leaderboardCache.set(mapId, cacheItems);
  }

  cacheItems.splice(0, cacheItems.length, ...dtos);
  leaderboardSubscribers.forEach((s) => s.handler(cacheItems));
}

function getTimeSubmissionResult(status: MonthlyTimeSubmissionResult["status"], message: string) {
  return {
    status,
    message,
  };
}

function validate(
  validators: MonthlyEventValidator<any>[],
  event: CreateMonthlyEventDto,
  divisions: Division[],
  originalEvent?: MonthlyEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, divisions, originalEvent));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
