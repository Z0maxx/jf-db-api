import z from "zod";
import {
  CreateAllOutEventSchema,
  CreateEventMapSchema,
  CreateTimeLimitedEventMapSchema,
  LeaderboardQuerySchema,
  UpdateAllOutEventSchema,
} from "./schemas";
import { TDivisionType } from "./db-entities/Division";
import { AllOutEvent } from "./db-entities/AllOutEvent";

export type GeneralEvent = {
  id: number;
  canceled: boolean;
  description: string;
  start: Date;
  end: Date;
};

export type Pr = {
  seconds: number;
  timestamp: Date;
};

export type SteamUser = {
  steamId64: string;
  name: string;
  avatar: string;
};

export type AppUser = SteamUser & {
  id: number;
  role: string;
  tempusId: number;
  claims: string[];
  divisions: Division[];
};

export type Division = {
  type: string;
  name: string;
  color: string;
};

export type Participant = SteamUser & {
  id: number;
  resigned: boolean;
  divisions: Division[];
};

export type LeaderboardItem = {
  id: number;
  user: SteamUser;
  pr: Pr;
};

export type CreateEventMap = z.infer<typeof CreateEventMapSchema>;

export type CreateTimeLimitedEventMap = z.infer<typeof CreateTimeLimitedEventMapSchema>;

export type EventMap = {
  id: number;
  name: string;
  division: Division;
};

export type TimeLimitedEventMap = EventMap & {
  timeLimit: number;
};

export type AllOutEventPreview = {
  id: number;
  canceled: boolean;
  start: Date;
  end: Date;
};

export type CreateAllOutEvent = z.infer<typeof CreateAllOutEventSchema>;

export type UpdateAllOutEvent = z.infer<typeof UpdateAllOutEventSchema>;

export type Maps<TEventMap extends EventMap> = { [K in TDivisionType]: TEventMap[] };

export type AllOutStage<TEventMap extends EventMap> = {
  description: string;
  start: Date;
  end: Date;
  maps: Maps<TEventMap>;
};

export type AllOutEventDetails = {
  id: number;
  canceled: boolean;
  description: string;
  stage1: AllOutStage<TimeLimitedEventMap>;
  stage2: AllOutStage<EventMap>;
  stage3: AllOutStage<EventMap>;
};

export type Lap = {
  count: number;
  lastTimestamp: Date;
};

export type LapLeaderboardItem = LeaderboardItem & {
  lap: Lap;
};

export type BountyGroups = {
  id: number;
  division: string;
  keyPrize: number;
  eventId: number;
};

export type BountyMap = {
  id: number;
  groupId: number;
  name: string;
};

export type BountyCompletion = {
  id: number;
  steamId64: string;
  mapId: number;
};

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

export type Registration = {
  eventId: number;
  userId: number;
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

export type AllOutValidator<T extends object> = {
  validate(
    errors: string[],
    event: CreateAllOutEvent | UpdateAllOutEvent,
    originalEvent?: AllOutEvent,
  ): void;
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
