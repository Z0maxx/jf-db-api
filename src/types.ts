import { Loaded } from "@mikro-orm/core";
import z from "zod";

import { TUserTempusIdStatus, User } from "./db-entities/User";
import { DivisionDto } from "./divisions/divisions.types";
import {
  CreateDivisionMapSchema,
  CreateTimeLimitedDivisionMapSchema,
  LeaderboardQuerySchema,
} from "./schemas";
import { SteamUser } from "./steam/steam.types";

export type PrDto = {
  seconds: number;
  timestamp: Date;
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

export type CreateDivisionMapDto = z.infer<typeof CreateDivisionMapSchema>;

export type CreateTimeLimitedDivisionMapDto = z.infer<typeof CreateTimeLimitedDivisionMapSchema>;

export type DivisionMapDto = {
  id: number;
  name: string;
  division: DivisionDto;
};

export type TimeLimitedDivisionMapDto = DivisionMapDto & {
  timeLimit: number;
};

export type MapsDto<TMap> = {
  soldier: TMap[];
  demoman: TMap[];
};

export type Lap = {
  count: number;
  lastTimestamp: Date;
};

export type LapLeaderboardItemDto = LeaderboardItemDto & {
  lap: Lap;
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

export type Schedule = {
  earlier: string;
  later: string;
};

export type LoadedUser = Loaded<User, "role.claimCollection" | "divisionCollection">;

export type DemoChatMessage = {
  kind: string;
  from: string;
  text: string;
  tick: number;
};

export type DemoUser = {
  name: string;
  steamId: string;
};

export type DemoContent = {
  chat: DemoChatMessage[];
  users: Record<string, DemoUser>;
  intervalPerTick: number;
};
