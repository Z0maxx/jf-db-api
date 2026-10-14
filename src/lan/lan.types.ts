import { LanEvent } from "#/db-entities/LanEvent";
import { DivisionDto } from "#/divisions/divisions.types";
import { SteamUser } from "#/steam/steam.types";
import { MapsDto } from "#/types";
import z from "zod";

import { CreateLanEventSchema, CreateLanParticipantSchema } from "./lan.schemas";

export type CreateLanParticipantDto = z.infer<typeof CreateLanParticipantSchema>;

export type LanParticipantDto = SteamUser & {
  id: number;
  disqualified: boolean;
  soldierDivision: DivisionDto;
  demomanDivision: DivisionDto;
  alias: string;
};

export type LanEventPreviewDto = {
  id: number;
  name: string;
  start: Date;
  canceled: boolean;
};

export type LanEventDetailsDto = {
  id: number;
  name: string;
  start: Date;
  end: Date | undefined;
  description: string;
  trailerUrl: string;
  posterUrl: string;
  canceled: boolean;
  maps: MapsDto<string>;
  participants: LanParticipantDto[];
};

export type CreateLanEventDto = z.infer<typeof CreateLanEventSchema>;

export type LanEventValidator<T> = {
  validate(errors: string[], event: CreateLanEventDto, originalEvent?: LanEvent): void;
  getMessages(items: T[]): string[];
};
