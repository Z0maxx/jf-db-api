import { MonthlyEvent, TMonthlyEventType } from "#/db-entities/MonthlyEvent";
import { DivisionDto } from "#/divisions/divisions.types";
import { SteamUser } from "#/steam/steam.types";
import { DivisionMapDto } from "#/types";
import z from "zod";

import { CreateMonthlyEventSchema, MonthlyTimeSubmissionSchema } from "./monthlies.schemas";
import { MonthlyParticipant } from "#/db-entities/MonthlyParticipant";
import { MonthlyMap } from "#/db-entities/MonthlyMap";

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

export type MontlyLeaderboardItemDto = {
  prTimestamp: Date;
  prSeconds: number;
  verified: boolean;
  participant: MonthlyParticipant;
  map: MonthlyMap;
}

export type MonthlyTimeSubmissionDto = z.infer<typeof MonthlyTimeSubmissionSchema>

export type MonthlyTimeSubmissionResult = {
  status: "verified" | "accepted" | "rejected"
  message: string
}

export type MonthlyEventValidator<T> = {
  validate(errors: string[], event: CreateMonthlyEventDto, originalEvent?: MonthlyEvent): void;
  getMessages(items: T[]): string[];
};
