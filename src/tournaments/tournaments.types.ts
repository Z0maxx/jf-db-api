import { Loaded } from "@mikro-orm/core";
import z from "zod";

import { TournamentEvent, TTournamentEventType } from "#/db-entities/TournamentEvent";
import { TournamentMatchup } from "#/db-entities/TournamentMatchup";
import { TournamentParticipant } from "#/db-entities/TournamentParticipant";
import { DivisionDto } from "#/divisions/divisions.types";
import { SteamUser } from "#/steam/steam.types";

import {
  CreateTournamentEventSchema,
  CreateTournamentParticipantSchema,
  SetTournamentMatchupsSchema,
  SetTournamentMatchupWinnerSchema,
} from "./tournaments.schemas";

export type CreateTournamentParticipantDto = z.infer<typeof CreateTournamentParticipantSchema>;

export type CreateTournamentEventDto = z.infer<typeof CreateTournamentEventSchema>;

export type TournamentEventPreviewDto = {
  id: number;
  type: TTournamentEventType;
  description: string;
  start: Date;
  end: Date | undefined;
  canceled: boolean;
};

export type TournamentEventDetailsDto = TournamentEventPreviewDto & {
  maps: string[];
  participants: TournamentParticipantDto[];
};

export type TournamentParticipantDto = SteamUser & {
  id: number;
  resigned: boolean;
  alias: string;
  soldierDivision: DivisionDto;
  demomanDivision: DivisionDto;
};

export type SetTournamentMatchupsDto = z.infer<typeof SetTournamentMatchupsSchema>;

export type SetTournamentMatchupWinnerDto = z.infer<typeof SetTournamentMatchupWinnerSchema>;

export type LoadedTournamentMatchup = Loaded<
  TournamentMatchup,
  "winnerNextMatchup" | "loserNextMatchup"
>;

export type TournamentMatchupParticipant = SteamUser & {
  id: number;
  alias: string;
};

export type TournamentBracketDto = {
  bracketIndex: number;
  matchups: {
    id: number;
    orderIndex: number;
    winnerIndex: number | undefined;
    participants: (TournamentMatchupParticipant | null)[];
  }[];
};

export type TournamentBracketsDto = {
  winnerBrackets: TournamentBracketDto[];
  loserBrackets: TournamentBracketDto[];
};

export type TournamentBracketsSubscriber = {
  id: string;
  eventId: number;
  handler: (brackets: TournamentBracketsDto) => void;
};

export type TournamentEventValidator<T> = {
  validate(
    errors: string[],
    event: CreateTournamentEventDto,
    originalEvent?: TournamentEvent,
  ): void;
  getMessages(items?: T[]): string[];
};

export type TournamentMatchupValidator<T> = {
  validate(
    errors: string[],
    matchups: SetTournamentMatchupsDto["matchups"],
    participants: TournamentParticipant[],
  ): void;
  getMessages(items: T[]): string[];
};
