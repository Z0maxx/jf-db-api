import { Loaded } from "@mikro-orm/core";
import z from "zod";

import { AllOutEvent } from "./db-entities/AllOutEvent";
import { Division, TDivisionType } from "./db-entities/Division";
import { TUserTempusIdStatus, User } from "./db-entities/User";
import {
  CreateAllOutEventSchema,
  CreateEventMapSchema,
  CreateRoleSchema,
  CreateTimeLimitedEventMapSchema,
  DivisionSchema,
  LeaderboardQuerySchema,
  UpdateAllOutEventSchema,
  SetUserDivisionsSchema,
  DivisionsListSchema,
} from "./schemas";

export type ClaimDto = {
  id: number;
  name: string;
};

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export type RoleDto = {
  name: string;
  claims: ClaimDto[];
};

export type GeneralEventDto = {
  id: number;
  canceled: boolean;
  description: string;
  start: Date;
  end: Date;
};

export type PrDto = {
  seconds: number;
  timestamp: Date;
};

export type SteamUser = {
  steam64Id: string;
  name: string;
  avatar: string;
};

export type AppUser = SteamUser & {
  id: number;
  role: string;
  tempusId?: number | undefined;
  tempusIdStatus: TUserTempusIdStatus;
  claims: string[];
  soldierDivision: DivisionDto;
  demomanDivision: DivisionDto;
};

export type DivisionDto = z.infer<typeof DivisionSchema>;

export type DivisionsListDto = z.infer<typeof DivisionsListSchema>;

export type ParticipantDto = SteamUser & {
  id: number;
  resigned: boolean;
  soldierDivision: DivisionDto;
  demomanDivision: DivisionDto;
};

export type LeaderboardItemDto = {
  id: number;
  user: SteamUser;
  pr: PrDto;
};

export type CreateEventMapDto = z.infer<typeof CreateEventMapSchema>;

export type CreateTimeLimitedEventMapDto = z.infer<typeof CreateTimeLimitedEventMapSchema>;

export type EventMapDto = {
  id: number;
  name: string;
  division: DivisionDto;
};

export type TimeLimitedEventMapDto = EventMapDto & {
  timeLimit: number;
};

export type AllOutEventPreviewDto = {
  id: number;
  canceled: boolean;
  start: Date;
  end: Date;
};

export type CreateAllOutEventDto = z.infer<typeof CreateAllOutEventSchema>;

export type UpdateAllOutEventDto = z.infer<typeof UpdateAllOutEventSchema>;

export type MapsDto<TEventMap extends EventMapDto> = { [K in TDivisionType]: TEventMap[] };

export type AllOutStageDto<TEventMap extends EventMapDto> = {
  description: string;
  start: Date;
  end: Date;
  maps: MapsDto<TEventMap>;
};

export type AllOutEventDetailsDto = {
  id: number;
  canceled: boolean;
  description: string;
  stage1: AllOutStageDto<TimeLimitedEventMapDto>;
  stage2: AllOutStageDto<EventMapDto>;
  stage3: AllOutStageDto<EventMapDto>;
};

export type Lap = {
  count: number;
  lastTimestamp: Date;
};

export type LapLeaderboardItemDto = LeaderboardItemDto & {
  lap: Lap;
};

export type BountyGroupsDto = {
  id: number;
  division: string;
  keyPrize: number;
  eventId: number;
};

export type BountyMapDto = {
  id: number;
  groupId: number;
  name: string;
};

export type BountyCompletionDto = {
  id: number;
  steam64Id: string;
  mapId: number;
};

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

export type Registration = {
  eventId: number;
  user: LoadedUser;
};

export type RegistrationDetails = {
  registered: boolean;
  resigned: boolean;
};

export type JwtUser = {
  id: number;
};

export type AuthResponse = {
  token: string;
  user: AppUser;
};

export type AllOutValidator<T> = {
  validate(
    errors: string[],
    event: CreateAllOutEventDto | UpdateAllOutEventDto,
    originalEvent?: AllOutEvent,
  ): void;
  getMessages(items: T[]): string[];
};

export type DivisionValidator = {
  validate(errors: string[], divisions: DivisionsListDto): void;
  getMessages(divisions: DivisionsListDto): string[];
};

export type RoleValidator<T> = {
  validate(errors: string[], roles: CreateRoleDto[]): void;
  getMessages(items: T[]): string[];
};

export type Schedule = {
  earlier: string;
  later: string;
};

export type StageInvalidDateFields = {
  stage: number;
  invalidDateFields: string[];
};

export type UserDivisions = {
  soldierDivision: Division;
  demomanDivision: Division;
};

export type SetUserDivisions = z.infer<typeof SetUserDivisionsSchema>;

export type TempusIdVerificationResult = {
  status: TUserTempusIdStatus;
  tempusId: number;
};

export type LoadedUser = Loaded<User, "role.claimCollection" | "divisionCollection">;
