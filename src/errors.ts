import { Registration } from "./types";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class EventNotFoundError extends NotFoundError {
  constructor(eventId: number) {
    super(`Event with id '${eventId}' not found`);
  }
}

export class MapNotFoundError extends NotFoundError {
  constructor(mapId: number) {
    super(`Map with id '${mapId}' not found`);
  }
}

export class RegistrationNotFoundError extends NotFoundError {
  constructor(registration: Registration) {
    super(
      `Registration for user '${registration.steamId64}' not found for event with id '${registration.eventId}'`,
    );
  }
}

export class SteamUsersNotFoundError extends NotFoundError {
  constructor(steamId64s: string[]) {
    const idsStr = `'${steamId64s.join("' '")}'`;
    super(`Steam users with ids ${idsStr} not found`);
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class SteamFailedError extends Error {
  constructor(message: string) {
    super(message);
  }
}
