import { MonthlyEvent, TMonthlyEventType } from "#/db-entities/MonthlyEvent";
import { DivisionDto } from "#/divisions/divisions.types";
import { SteamUser } from "#/steam/steam.types";
import { DivisionMapDto } from "#/types";
import z from "zod";

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

export type MonthlyEventValidator<T> = {
  validate(errors: string[], event: CreateMonthlyEventDto, originalEvent?: MonthlyEvent): void;
  getMessages(items: T[]): string[];
};
