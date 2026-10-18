import { MonthlyEvent } from "#/db-entities/MonthlyEvent";
import { DivisionsNotFoundError } from "#/divisions/divisions.errors";
import { divisionsRepository } from "#/divisions/divisions.repository";
import {
  AlreadyRegisteredError,
  EventEndedError,
  EventNotFoundError,
  EventStartedInPastError,
  NoMapsWithUserDivisionsError,
  RegistrationNotFoundError,
  ValidationError,
} from "#/errors";
import { steamService } from "#/steam/steam.service";
import { tempusService } from "#/tempus/tempus.service";
import { LoadedUser, Registration, RegistrationDetails } from "#/types";

import { monthliesRepository } from "./monthlies.repository";
import {
  CreateMonthlyEventDto,
  MonthlyEventDetailsDto,
  MonthlyEventPreviewDto,
  MonthlyEventValidator,
  MonthlyParticipantDto,
  MonthlyTimeSubmissionDto,
  MonthlyTimeSubmissionResult,
} from "./monthlies.types";
import { monthlyCreatedDateValidator } from "./validators/monthly-created-date.validator";
import { monthlyDivisionSingleMapValidator } from "./validators/monthly-division-single-map.validator";
import { monthlyScheduleValidator } from "./validators/monthly-schedule.validator";
import { monthlyUpdatedDateValidator } from "./validators/monthly-updated-date.validator";

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

  async createEventAsync(event: CreateMonthlyEventDto) {
    validate(
      [monthlyDivisionSingleMapValidator, monthlyCreatedDateValidator, monthlyScheduleValidator],
      event,
    );

    await checkEventDivisionsExistAsync(event);
    const id = await monthliesRepository.createEventAsync(event);
    return await this.getEventDetailsAsync(id);
  },

  async updateEventAsync(eventId: number, event: CreateMonthlyEventDto) {
    const originalEvent = await getEventByIdAsync(eventId);
    validate(
      [monthlyDivisionSingleMapValidator, monthlyUpdatedDateValidator, monthlyScheduleValidator],
      event,
      originalEvent,
    );

    await checkEventDivisionsExistAsync(event);
    await monthliesRepository.updateEventAsync(originalEvent, event);
    return await this.getEventDetailsAsync(eventId);
  },

  async submitTimeAsync(user: LoadedUser, submission: MonthlyTimeSubmissionDto): Promise<MonthlyTimeSubmissionResult> {
    const event = await getEventByIdAsync(submission.eventId);
    const participant = await getParticipantAsync({ eventId: submission.eventId, user })
    const map = event.monthlyMapCollection.$.find(m => m.division.$.id === participant.division.id)!
    const completion = await tempusService.getCompletionAsync({ type: event.type, tempusId: user.tempusId!, mapName: map.name })
    if (!completion) {
      return {
        status: "rejected",
        message: "Tempus record not found for map"
      }
    }

    if (submission.time === undefined) {
      if (completion.prTimestamp < event.start) {
        return {
          status: "rejected",
          message: "Tempus record is older than event's start time"
        }
      }

      if (completion.prTimestamp > event.end) {
        return {
          status: "rejected",
          message: "Tempus record is after event's end time"
        }
      }

      await monthliesRepository.setLeaderboardItemAsync({
        verified: true,
        map,
        participant,
        ...completion
      })

      return {
        status: "verified",
        message: "Tempus record successfully verified"
      }
    }
    else {
      if (completion.prSeconds > submission.time) {
        return {
          status: "rejected",
          message: "Tempus record is slower than submitted time"
        }
      }

      await monthliesRepository.setLeaderboardItemAsync({
        verified: false,
        map,
        participant,
        prSeconds: submission.time,
        prTimestamp: new Date()
      })

      return {
        status: "accepted",
        message: "Accepted submitted time"
      }
    }
  },

  async registerAsync(registration: Registration) {
    const event = await getEventByIdAsync(registration.eventId);
    checkEventNotEnded(event)
    await checkUserHasEventDivisionsAsync(event, registration.user);
    await checkNotAlreadyRegisteredAsync(registration);
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
  const participant = await monthliesRepository.getParticipantAsync(registration.eventId, registration.user)
  if (!participant) {
    throw new RegistrationNotFoundError(registration);
  }

  return participant
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

async function checkEventDivisionsExistAsync(event: CreateMonthlyEventDto) {
  const divisionIds = Array.from(new Set(event.maps.map((m) => m.divisionId)));
  const exisitingDivisions = await divisionsRepository.getDivisionsByIdsAsync(divisionIds);
  if (exisitingDivisions.length !== divisionIds.length) {
    throw new DivisionsNotFoundError(
      divisionIds.filter((dId) => !exisitingDivisions.some((e) => e.id === dId)),
    );
  }
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

function validate(
  validators: MonthlyEventValidator<any>[],
  event: CreateMonthlyEventDto,
  originalEvent?: MonthlyEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, originalEvent));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
