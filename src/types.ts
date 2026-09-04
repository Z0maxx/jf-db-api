import z from "zod";
import {
  CreateAllOutEventSchema,
  CreateEventMapSchema,
  CreateTimeLimitedEventMapSchema,
  LeaderboardQuerySchema,
  UpdateAllOutEventSchema,
} from "./schemas";

export type GeneralEvent = {
  id: number;
  description: string;
  start: Date;
  end: Date;
};

export type LeaderboardItem = {
  id: number;
  user: SteamUser;
  prSeconds: number;
  prTimestamp: Date;
};

export type CreateEventMap = z.infer<typeof CreateEventMapSchema>;

export type CreateTimeLimitedEventMap = z.infer<typeof CreateTimeLimitedEventMapSchema>;

export type EventMap = {
  id: number;
  name: string;
};

export type TimeLimitedEventMap = EventMap & {
  timeLimit: number;
};

export type AllOutEventPreview = {
  id: number;
  start: Date;
  end: Date;
};

export type CreateAllOutEvent = z.infer<typeof CreateAllOutEventSchema>;

export type UpdateAllOutEvent = z.infer<typeof UpdateAllOutEventSchema>;

export type AllOutStage<TEventMap extends EventMap> = {
  description: string;
  start: Date;
  end: Date;
  maps: TEventMap[];
};

export type AllOutEventDetails = {
  id: number;
  description: string;
  stage1: AllOutStage<TimeLimitedEventMap>;
  stage2: AllOutStage<EventMap>;
  stage3: AllOutStage<EventMap>;
};

export type LapLeaderboardItem = LeaderboardItem & {
  lapCount: number;
  lastLapTimestamp: Date;
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
  steamId64: string;
};

export type SteamUser = {
  steamId64: string;
  name: string;
  avatar: string;
};

export type AppUser = {
  steamId64: string;
  role: string;
};

export type SteamAuthResponse = {
  token: string;
  user: SteamUser;
  role: string;
};
