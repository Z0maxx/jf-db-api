import crypto from "node:crypto";
import { Worker } from "node:worker_threads";

import { Division } from "#/db-entities/Division";
import { MonthlyEvent } from "#/db-entities/MonthlyEvent";
import { DivisionsNotFoundError } from "#/divisions/divisions.errors";
import { divisionsRepository } from "#/divisions/divisions.repository";
import { envConfig } from "#/env-config";
import {
  AlreadyRegisteredError,
  EventEndedError,
  EventNotFoundError,
  EventNotStartedError,
  EventStartedInPastError,
  LeaderboardItemNotFoundError,
  MapNotFoundError,
  NoMapsWithUserDivisionsError,
  RegistrationNotFoundError,
  TempusServerNotFoundError,
  ValidationError,
} from "#/errors";
import { steamService } from "#/steam/steam.service";
import { tempusService } from "#/tempus/tempus.service";
import { TempusCompletionResult } from "#/tempus/tempus.types";
import { LoadedUser, Registration, RegistrationDetails } from "#/types";

import { workerFileName } from "./submission-verification.worker";
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
  MonthlyLeaderboardSubmissionDto,
  MonthlyLeaderboardVerificationWorkerResult,
} from "./monthlies.types";
import { monthlyCreatedDateValidator } from "./validators/monthly-created-date.validator";
import { monthlyDivisionSingleMapValidator } from "./validators/monthly-division-single-map.validator";
import { monthlyDivisionTypeValidator } from "./validators/monthly-division-type.validator";
import { monthlyScheduleValidator } from "./validators/monthly-schedule.validator";
import { monthlyUpdatedDateValidator } from "./validators/monthly-updated-date.validator";

const tempusServerIdCache = new Set<number>();
const leaderboardSubscribers: MonthlyLeaderboardSubscriber[] = [];
const leaderboardCache = new Map<number, MonthlyLeaderboardItemDto[]>();
const verificationWorker = new Worker(workerFileName, {
  execArgv: ["--import", "tsx"],
});

let verificationTimer: NodeJS.Timeout | undefined;

export const monthliesService = {
  submissionAccepted: getTimeSubmissionResult("accepted", "Accepted submitted time"),
  submissionVerified: getTimeSubmissionResult("verified", "Tempus record successfully verified"),
  recordNotFound: getTimeSubmissionResult("rejected", "Tempus record not found for map"),
  recordOlderThanEvent: getTimeSubmissionResult(
    "rejected",
    "Tempus record is older than event's start time",
  ),
  recordNewerThanEvent: getTimeSubmissionResult(
    "rejected",
    "Tempus record is after event's end time",
  ),
  recordSlowerThanSubmission: getTimeSubmissionResult(
    "rejected",
    "Tempus record is slower than submitted time",
  ),

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
      mapId,
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
    const now = new Date();
    const event = await getEventByIdAsync(submission.eventId);
    checkEventStarted(event);
    const participant = await getParticipantAsync({ eventId: submission.eventId, user });
    const map = event.monthlyMapCollection.$.find(
      (m) => m.division.$.id === participant.division.id,
    )!;

    const completion = await tempusService.getCompletionAsync({
      type: event.type,
      tempusId: user.tempusId!,
      mapName: map.name,
    });

    const result = verifyTimeSubmission(event, submission, completion);
    let updateCache = false;
    if (result.status === "verified") {
      updateCache = true;
      await monthliesRepository.setLeaderboardItemAsync({
        verified: true,
        map,
        participant,
        ...completion!,
      });
    } else if (result.status === "accepted") {
      await checkTempusServerExistsAsync(submission.details!.tempusServerId);
      updateCache = true;
      const leaderboardItem = await monthliesRepository.setLeaderboardItemAsync({
        verified: false,
        map,
        participant,
        prSeconds: submission.details!.timeSeconds!,
        prTimestamp: now,
      });

      await monthliesRepository.setLeaderboardSubmission({
        submissionTimestamp: now,
        tempusServerId: submission.details!.tempusServerId,
        leaderboardItem,
        event,
      });

      processLeaderboardSubmissions(event);
    }

    if (updateCache) {
      updateLeaderboardCacheAsync(map.id);
    }

    return result;
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

  async deleteLeaderboardItemAsync(itemId: number) {
    const item = await getLeaderboardItemAsync(itemId);
    await monthliesRepository.deleteLeaderboardItemsAsync([item]);
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

async function getAllLeaderboardSubmissionsAsync(): Promise<MonthlyLeaderboardSubmissionDto[]> {
  const items = await monthliesRepository.getAllLeaderboardSubmissionsAsync();
  return items.map((i) => ({
    id: i.id,
    mapId: i.leaderboardItem.$.map.id,
    leaderboardItemId: i.leaderboardItem.id,
    submissionTimestamp: i.submissionTimestamp,
    seconds: i.leaderboardItem.$.prSeconds,
    tempusServerId: i.tempusServerId,
    mapName: i.leaderboardItem.$.map.$.name,
    steam64Id: i.leaderboardItem.$.participant.$.user.$.steam64Id,
    event: {
      type: i.event.$.type,
      end: i.event.$.end,
    },
  }));
}

async function getLeaderboardItemAsync(itemId: number) {
  const item = await monthliesRepository.getLeaderboardItemAsync(itemId);
  if (!item) {
    throw new LeaderboardItemNotFoundError(itemId);
  }

  return item;
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

function checkEventStarted(event: MonthlyEvent) {
  const now = new Date();
  if (event.start > now) {
    throw new EventNotStartedError(event.id, event.start);
  }
}

async function checkTempusServerExistsAsync(serverId: number) {
  if (!tempusServerIdCache.has(serverId)) {
    const servers = await tempusService.getServersAsync();
    servers.forEach((s) => tempusServerIdCache.add(s.id));
    if (!tempusServerIdCache.has(serverId)) {
      throw new TempusServerNotFoundError(serverId);
    }
  }
}

async function updateLeaderboardCacheAsync(...mapIds: number[]) {
  return await Promise.all(
    mapIds.map(async (mId) => {
      const items = await monthliesRepository.getLeaderboardAsync(mId);
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

      let cacheItems = leaderboardCache.get(mId);
      if (!cacheItems) {
        cacheItems = [];
        leaderboardCache.set(mId, cacheItems);
      }

      cacheItems.splice(0, cacheItems.length, ...dtos);
      leaderboardSubscribers.filter((s) => s.mapId === mId).forEach((s) => s.handler(cacheItems));
    }),
  );
}

function verifyTimeSubmission(
  event: MonthlyEvent,
  submission: MonthlyTimeSubmissionDto,
  completion: TempusCompletionResult | null,
) {
  if (!completion) {
    return monthliesService.recordNotFound;
  }

  if (!submission.details) {
    if (completion.prTimestamp < event.start) {
      return monthliesService.recordOlderThanEvent;
    } else if (completion.prTimestamp > event.end) {
      return monthliesService.recordNewerThanEvent;
    }

    return monthliesService.submissionVerified;
  } else {
    if (completion.prSeconds > submission.details.timeSeconds) {
      return monthliesService.recordSlowerThanSubmission;
    }

    return monthliesService.submissionAccepted;
  }
}

function getTimeSubmissionResult<
  Status extends MonthlyTimeSubmissionResult["status"],
  Message extends string,
>(status: Status, message: Message) {
  return {
    status,
    message,
  } as const;
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

function getMinutesAfterEventEnded(event: MonthlyEvent) {
  const now = new Date();
  return (now.getTime() - event.end.getTime()) / 1000 / 60;
}

function processLeaderboardSubmissions(event: MonthlyEvent) {
  if (verificationTimer) {
    return;
  }

  verificationTimer = setInterval(
    async () => {
      const submissions = await getAllLeaderboardSubmissionsAsync();
      
      if (
        submissions.length === 0 &&
        getMinutesAfterEventEnded(event) > envConfig.MONTHLY_SUBMISSION_EXTRA_MINUTES
      ) {
        verificationWorker.postMessage({ type: "cleanup" });
        clearInterval(verificationTimer);
        return;
      }

      if (submissions.length > 0) {
        console.log("called worker")
        verificationWorker.postMessage({
          type: "submissions",
          submissions,
        });
      }
    },
    envConfig.MONTHLY_VERIFICATION_LOOP_MINUTES * 1000 * 60,
  );
}

verificationWorker.on(
  "message",
  async ({
    verifiedSubmissions,
    rejectedSubmissions,
  }: MonthlyLeaderboardVerificationWorkerResult) => {
    if (verifiedSubmissions.length === 0 && rejectedSubmissions.length === 0) {
      return;
    }

    const prTimestamps = new Map<number, Date>(
      verifiedSubmissions.map((v) => [v.leaderboardItemId, v.prTimestamp!]),
    );

    const verifiedItems = await monthliesRepository.getLeaderboardItemsAsync(
      verifiedSubmissions.map((v) => v.leaderboardItemId),
    );

    const rejectedItems = await monthliesRepository.getLeaderboardItemsAsync(
      rejectedSubmissions.map((r) => r.leaderboardItemId),
    );

    const submissions = await monthliesRepository.getLeaderboardSubmissionsByIdsAsync([
      ...verifiedSubmissions.map((v) => v.id),
      ...rejectedSubmissions.map((r) => r.id),
    ]);

    await Promise.all([
      monthliesRepository.deleteLeaderboardItemsAsync(rejectedItems),
      monthliesRepository.deleteLeaderboardSubmissionsAsync(submissions),
      monthliesRepository.verifyLeaderboardItemsAsync(
        verifiedItems.map((i) => ({
          leaderboardItem: i,
          prTimestamp: prTimestamps.get(i.id)!,
        })),
      ),
    ]);

    const mapIds = Array.from(
      new Set([
        ...verifiedSubmissions.map((v) => v.mapId),
        ...rejectedSubmissions.map((r) => r.mapId),
      ]),
    );

    updateLeaderboardCacheAsync(...mapIds);
  },
);
