import { Loaded } from "@mikro-orm/core";

import { TournamentEvent } from "#/db-entities/TournamentEvent";
import { TournamentParticipant } from "#/db-entities/TournamentParticipant";
import {
  EventEndedError,
  EventNotFoundError,
  EventStartedInPastError,
  MatchupNotFoundError,
  MatchupParticpantNotFound,
  ParticipantNotFoundError,
  ValidationError,
} from "#/errors";
import { steamService } from "#/steam/steam.service";
import { UsersNotFoundError } from "#/users/users.errors";
import { usersRepository } from "#/users/users.repository";
import { getUserDivisionDtos } from "#/util";

import { tournamentsRepository } from "./tournaments.repository";
import {
  CreateTournamentEventDto,
  SetTournamentMatchupsDto,
  SetTournamentMatchupWinnerDto,
  TournamentBracketsDto,
  TournamentBracketsSubscriber,
  TournamentEventDetailsDto,
  TournamentEventPreviewDto,
  TournamentEventValidator,
  TournamentMatchupValidator,
} from "./tournaments.types";
import { tournamentCreatedDateValidator } from "./validators/tournament-created-date.validator";
import { tournamentMatchupIncludedParticipantValidator } from "./validators/tournament-matchup-included-participant.validator";
import { tournamentMatchupUniqueParticipantValidator } from "./validators/tournament-matchup-unique-participant.validator";
import { tournamentParticipantCountValidator } from "./validators/tournament-participant-count.validator";
import { tournamentUniqueMapValidator } from "./validators/tournament-unique-map.validator";
import { tournamentUniqueParticipantAliasValidator } from "./validators/tournament-unique-participant-alias.validator";
import { tournamentUniqueParticipantValidator } from "./validators/tournament-unique-participant.validator";
import { tournamentUpdatedDateValidator } from "./validators/tournament-updated-date.validator";

const bracketsSubscribers: TournamentBracketsSubscriber[] = [];

export const tournamentsService = {
  async getEventDetailsAsync(eventId: number): Promise<TournamentEventDetailsDto> {
    const event = await getEventByIdAsync(eventId);
    const participants = event.tournamentParticipantCollection.$;
    const steamUsers = await steamService.getUsersAsync(
      participants.map((p) => p.user.$.steam64Id),
    );

    return {
      id: event.id,
      type: event.type,
      description: event.description,
      start: event.start,
      end: event.end,
      canceled: event.canceled,
      maps: event.tournamentMapCollection.$.map((m) => m.name),
      participants: participants.map((p) => ({
        id: p.id,
        resigned: p.resigned,
        alias: p.alias,
        ...getUserDivisionDtos(p.user.$),
        ...steamUsers.get(p.user.$.steam64Id)!,
      })),
    };
  },

  async getAllEventPreviewsAsync(): Promise<TournamentEventPreviewDto[]> {
    const events = await tournamentsRepository.getAllEventsAsync();
    return events.map(({ id, type, description, start, end, canceled }) => ({
      id,
      type,
      description,
      start,
      end,
      canceled,
    }));
  },

  async subscribeToBracketsAsync(
    eventId: number,
    callback: (brackets: TournamentBracketsDto) => void,
  ) {
    const brackets = await getEventBracketsDtosAsync(eventId);
    callback(brackets);
    const subscriberId = crypto.randomUUID();
    bracketsSubscribers.push({
      id: subscriberId,
      eventId,
      handler: callback,
    });

    return subscriberId;
  },

  unsubscribeFromBrackets(subscriberId: string) {
    const idx = bracketsSubscribers.findIndex((s) => s.id === subscriberId);
    if (idx > -1) {
      bracketsSubscribers.splice(idx, 1);
    }
  },

  async createEventAsync(event: CreateTournamentEventDto): Promise<TournamentEventDetailsDto> {
    validateEvent(
      [
        tournamentCreatedDateValidator,
        tournamentUniqueMapValidator,
        tournamentUniqueParticipantValidator,
        tournamentUniqueParticipantAliasValidator,
        tournamentParticipantCountValidator,
      ],
      event,
    );

    await checkUsersExistAsync(event);
    const id = await tournamentsRepository.createEventAsync(event);
    return await this.getEventDetailsAsync(id);
  },

  async updateEventAsync(
    eventId: number,
    event: CreateTournamentEventDto,
  ): Promise<TournamentEventDetailsDto> {
    const originalEvent = await getEventByIdAsync(eventId);
    validateEvent(
      [
        tournamentUpdatedDateValidator,
        tournamentUniqueMapValidator,
        tournamentUniqueParticipantValidator,
        tournamentUniqueParticipantAliasValidator,
        tournamentParticipantCountValidator,
      ],
      event,
      originalEvent,
    );

    await checkUsersExistAsync(event);
    await tournamentsRepository.updateEventAsync(originalEvent, event);
    return await this.getEventDetailsAsync(eventId);
  },

  async setMatchupsAsync(eventId: number, setMatchups: SetTournamentMatchupsDto) {
    const event = await getEventByIdAsync(eventId);
    validateMatchups(
      [tournamentMatchupIncludedParticipantValidator, tournamentMatchupUniqueParticipantValidator],
      setMatchups.matchups,
      event.tournamentParticipantCollection.getItems(),
    );

    await tournamentsRepository.setMatchupsAsync(event, setMatchups);
  },

  async setMatchupWinnerAsync({ matchupId, winnerIndex }: SetTournamentMatchupWinnerDto) {
    const matchup = await getMatchupByIdAsync(matchupId);
    const participant = winnerIndex === 0 ? matchup.participant1 : matchup.participant2;
    if (!participant) {
      throw new MatchupParticpantNotFound(matchupId, winnerIndex);
    }

    await tournamentsRepository.setMatchupWinnerAsync(matchup, winnerIndex);
    const brackets = await getEventBracketsDtosAsync(matchup.event.id);
    bracketsSubscribers
      .filter((s) => s.eventId === matchup.event.id)
      .forEach((s) => s.handler(brackets));
  },

  async disqualifyParticipantAsync(participantId: number) {
    const participant = await getParticipantByIdAsync(participantId);
    await tournamentsRepository.disqualifyParticipantAsync(participant);
  },

  async cancelEventAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId);
    checkEventNotEnded(event);
    await tournamentsRepository.cancelEventAsync(event);
  },

  async deleteEventAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId);
    checkEventNotStartedInPast(event);
    await tournamentsRepository.deleteEventAsync(event);
  },
};

async function getEventByIdAsync(eventId: number) {
  const event = await tournamentsRepository.getEventByIdAsync(eventId);
  if (!event) {
    throw new EventNotFoundError(eventId);
  }

  return event;
}

async function getParticipantByIdAsync(participantId: number) {
  const participant = await tournamentsRepository.getParticipantByIdAsync(participantId);
  if (!participant) {
    throw new ParticipantNotFoundError(participantId);
  }

  return participant;
}

async function getMatchupByIdAsync(matchupId: number) {
  const matchup = await tournamentsRepository.getMatchupByIdAsync(matchupId);
  if (!matchup) {
    throw new MatchupNotFoundError(matchupId);
  }

  return matchup;
}

async function getEventBracketsDtosAsync(eventId: number): Promise<TournamentBracketsDto> {
  const event = await getEventByIdAsync(eventId);
  const matchups = await tournamentsRepository.getEventMatchupsAsync(eventId);
  if (matchups.length === 0) return { winnerBrackets: [], loserBrackets: [] };

  const participants = event.tournamentParticipantCollection.$;
  const steamUsers = await steamService.getUsersAsync(participants.map((p) => p.user.$.steam64Id));
  const matchupsByType = Object.groupBy(matchups, (m) => m.type);
  const winnerMatchupsByBracket = Object.groupBy(matchupsByType.winner!, (m) => m.bracketIndex);
  const loserMatchupsByBracket = Object.groupBy(matchupsByType.loser!, (m) => m.bracketIndex);
  const participantsMap = new Map<number, Loaded<TournamentParticipant, "user.divisionCollection">>(
    event.tournamentParticipantCollection.$.map((p) => [p.id, p]),
  );

  const [winnerBrackets, loserBrackets] = [winnerMatchupsByBracket, loserMatchupsByBracket].map(
    (byBracket) =>
      Object.entries(byBracket)
        .map(([bracketIndex, matchups]) => ({
          bracketIndex: parseInt(bracketIndex),
          matchups: matchups!
            .map((m) => ({
              id: m.id,
              orderIndex: m.orderIndex,
              winnerIndex: m.winnerIndex,
              participants: [m.participant1, m.participant2].map((p) => {
                if (!p) {
                  return null;
                }

                const participant = participantsMap.get(p.id)!;
                return {
                  id: participant.id,
                  alias: participant.alias,
                  ...steamUsers.get(participant.user.$.steam64Id)!,
                };
              }),
            }))
            .toSorted((a, b) => a.orderIndex - b.orderIndex),
        }))
        .toSorted((a, b) => a.bracketIndex - b.bracketIndex),
  );

  return {
    winnerBrackets,
    loserBrackets,
  };
}

async function checkUsersExistAsync(event: CreateTournamentEventDto) {
  const userIds = event.participants.map((participant) => participant.userId);
  const users = await usersRepository.getExistingUsersAsync(userIds);
  const missingUsers = userIds.filter((id) => !users.has(id));
  if (missingUsers.length > 0) {
    throw new UsersNotFoundError(missingUsers);
  }
}

function checkEventNotStartedInPast(event: TournamentEvent) {
  if (event.start <= new Date()) {
    throw new EventStartedInPastError(event.id, event.start);
  }
}

function checkEventNotEnded(event: TournamentEvent) {
  if (event.end) {
    throw new EventEndedError(event.id, event.end!);
  }
}

function validateEvent(
  validators: TournamentEventValidator<any>[],
  event: CreateTournamentEventDto,
  originalEvent?: TournamentEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, originalEvent));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}

function validateMatchups(
  validators: TournamentMatchupValidator<any>[],
  matchups: SetTournamentMatchupsDto["matchups"],
  participants: TournamentParticipant[],
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, matchups, participants));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
