import { LanMapType } from "#/db-entities/LanMap";
import { EventNotFoundError, ParticipantNotFoundError, UsersNotFoundError, ValidationError } from "#/errors";
import { steamService } from "#/steam/steam.service";
import { LanEvent } from "#/db-entities/LanEvent";
import {
  CreateLanEventDto,
  LanEventDetailsDto,
  LanEventPreviewDto,
  LanEventValidator,
} from "#/types";
import { usersRepository } from "#/users/users.repository";
import { getUserDivisionDtos } from "#/util";

import { lanRepository } from "./lan.repository";
import { lanCreatedDateValidator } from "./validators/lan-created-date.validator";
import { lanDuplicateMapValidator } from "./validators/lan-duplicate-map.validator";
import { lanDuplicateParticipantAliasValidator } from "./validators/lan-duplicate-participant-alias.validator";
import { lanDuplicateParticipantValidator } from "./validators/lan-duplicate-participant.validator";
import { lanUpdatedDateValidator } from "./validators/lan-updated-date.validator";

export const lanService = {
  async getEventDetailsAsync(eventId: number): Promise<LanEventDetailsDto> {
    const event = await getEventByIdAsync(eventId);
    const steam64Ids = event.lanParticipantCollection.$.map((p) => p.user.$.steam64Id);
    const steamUsers = await steamService.getUsersAsync(steam64Ids);
    const maps = event.lanMapCollection.$;
    const [soldierMaps, demomanMaps] = [
      maps.filter((m) => m.type === LanMapType.SOLDIER),
      maps.filter((m) => m.type === LanMapType.DEMOMAN),
    ].map((maps) => maps.map((m) => m.name));

    return {
      id: event.id,
      name: event.name,
      start: event.start,
      end: event.end,
      description: event.description,
      trailerUrl: event.trailerUrl,
      posterUrl: event.posterUrl,
      canceled: event.canceled,
      maps: {
        soldier: soldierMaps,
        demoman: demomanMaps,
      },
      participants: event.lanParticipantCollection.$.map((p) => ({
        id: p.id,
        disqualified: p.disqualified,
        alias: p.alias,
        ...getUserDivisionDtos(p.user.$),
        ...steamUsers.get(p.user.$.steam64Id)!,
      })),
    };
  },

  async getAllEventPreviewsAsync(): Promise<LanEventPreviewDto[]> {
    const events = await lanRepository.getAllEventsAsync();
    return events.map(({ id, name, start, canceled }) => ({
      id,
      name,
      start,
      canceled,
    }));
  },

  async createEventAsync(event: CreateLanEventDto): Promise<LanEventDetailsDto> {
    validate(
      [
        lanCreatedDateValidator,
        lanDuplicateMapValidator,
        lanDuplicateParticipantValidator,
        lanDuplicateParticipantAliasValidator,
      ],
      event,
    );

    await checkUsersExistAsync(event);
    const id = await lanRepository.createEventAsync(event);
    return await this.getEventDetailsAsync(id);
  },

  async updateEventAsync(eventId: number, event: CreateLanEventDto): Promise<LanEventDetailsDto> {
    const originalEvent = await getEventByIdAsync(eventId);
    validate(
      [
        lanUpdatedDateValidator,
        lanDuplicateMapValidator,
        lanDuplicateParticipantValidator,
        lanDuplicateParticipantAliasValidator,
      ],
      event,
      originalEvent,
    );

    await checkUsersExistAsync(event);
    await lanRepository.updateEventAsync(originalEvent, event);
    return await this.getEventDetailsAsync(eventId);
  },

  async cancelEventAsync(eventId: number) {
    const event = await getEventByIdAsync(eventId)
    await lanRepository.cancelEventAsync(event)
  },

  async disqualifyParticipant(participantId: number) {
    const participant = await getParticipantByIdAsync(participantId)
    await lanRepository.disqualifyParticipantAsync(participant)
  }
};

async function getEventByIdAsync(eventId: number) {
  const event = await lanRepository.getEventByIdAsync(eventId);
  if (!event) {
    throw new EventNotFoundError(eventId);
  }

  return event;
}

async function getParticipantByIdAsync(participantId: number) {
  const participant = await lanRepository.getParticipantByIdAsync(participantId)
  if (!participant) {
    throw new ParticipantNotFoundError(participantId)
  }

  return participant
}

async function checkUsersExistAsync(event: CreateLanEventDto) {
  const userIds = event.participants.map((p) => p.userId);
  const users = await usersRepository.getExistingUsersAsync(userIds);
  const missingUsers = userIds.filter((id) => !users.has(id));
  if (missingUsers.length > 0) {
    throw new UsersNotFoundError(missingUsers);
  }
}

function validate(
  validators: LanEventValidator<any>[],
  event: CreateLanEventDto,
  originalEvent?: LanEvent,
) {
  const errors: string[] = [];
  validators.forEach((v) => v.validate(errors, event, originalEvent));
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
}
