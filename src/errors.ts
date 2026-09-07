import { Registration } from "./types";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class EventNotFoundError extends NotFoundError {
  constructor(eventId: number) {
    super(`Event with id '${eventId}' not found`);
    this.name = "EventNotFoundError";
  }
}

export class MapNotFoundError extends NotFoundError {
  constructor(mapId: number) {
    super(`Map with id '${mapId}' not found`);
    this.name = "MapNotFoundError";
  }
}

export class RegistrationNotFoundError extends NotFoundError {
  constructor(registration: Registration) {
    super(
      `Registration for user '${registration.userId}' not found for event with id '${registration.eventId}'`,
    );
    this.name = "RegistrationNotFoundError";
  }
}

export class SteamUsersNotFoundError extends NotFoundError {
  constructor(steamId64s: string[]) {
    const idsStr = `'${steamId64s.join("' '")}'`;
    super(`Steam users with ids ${idsStr} not found`);
    this.name = "SteamUsersNotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class SteamFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SteamFailedError";
  }
}
