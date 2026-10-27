import z from "zod";

import { Division } from "#/db-entities/Division";
import { MonthlyEvent, TMonthlyEventType } from "#/db-entities/MonthlyEvent";
import { DivisionDto } from "#/divisions/divisions.types";
import { SteamUser } from "#/steam/steam.types";
import { DivisionMapDto } from "#/types";

import { CreateMonthlyEventSchema } from "./monthlies.schemas";

export type CreateMonthlyEventDto = z.infer<typeof CreateMonthlyEventSchema>;

export type MonthlyEventPreviewDto = {
  id: number;
  canceled: boolean;
  start: Date;
  end: Date;
};

export type MonthlyEventDetailsDto = {
  id: number;
  type: TMonthlyEventType;
  canceled: boolean;
  description: string;
  start: Date;
  end: Date;
  maps: DivisionMapDto[];
};

export type MonthlyParticipantDto = SteamUser & {
  id: number;
  resigned: boolean;
  division: DivisionDto;
};

export type MonthlyLeaderboardItemDto = {
  id: number;
  user: SteamUser;
  pr: {
    verified: boolean;
    timestamp: Date;
    seconds: number;
  };
};

export type MonthlyTimeSubmissionDto = {
  eventId: number;
  details?:
    | {
        timeSeconds: number;
        tempusServerId: number;
      }
    | undefined;
};

export type MonthlyLeaderboardSubmissionDto = {
  id: number;
  mapId: number;
  mapName: string;
  steam64Id: string;
  leaderboardItemId: number;
  seconds: number;
  tempusServerId: number;
  submissionTimestamp: Date;
  prTimestamp?: Date | undefined;
  event: {
    type: TMonthlyEventType;
    end: Date;
  };
};

export type MonthlyTimeSubmissionResult = {
  status: "verified" | "accepted" | "rejected";
  message: string;
};

export type MonthlyLeaderboardSubscriber = {
  id: string;
  mapId: number;
  handler: (items: MonthlyLeaderboardItemDto[]) => void;
};

export type MonthlyEventValidator<T> = {
  validate(
    errors: string[],
    event: CreateMonthlyEventDto,
    divisions: Division[],
    originalEvent?: MonthlyEvent,
  ): void;
  getMessages(items: T[]): string[];
};

export type MonthlyLeaderboardVerificationWorkerMessage = {
  type: "submissions" | "cleanup";
  submissions?: MonthlyLeaderboardSubmissionDto[] | undefined;
};

export type MonthlyLeaderboardVerificationWorkerResult = {
  verifiedSubmissions: MonthlyLeaderboardSubmissionDto[];
  rejectedSubmissions: MonthlyLeaderboardSubmissionDto[];
};
