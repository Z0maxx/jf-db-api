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

export class SteamUsersNotFoundError extends NotFoundError {
  constructor(steamId64s: string[]) {
    const idsStr = `'${steamId64s.join("' '")}'`;
    super(`Steam users with ids ${idsStr} not found`);
    this.name = "SteamUsersNotFoundError";
  }
}

export class DivisionsNotFoundError extends NotFoundError {
  constructor(divisionIds: number[]) {
    const idsStr = `'${divisionIds.join("' '")}'`;
    super(`Divisions with ids ${idsStr} not found`);
    this.name = "DivisionsNotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class CannotRegisterError extends Error {
  constructor(registration: Registration) {
    super(
      `User with id '${registration.userId}' cannot register to event with id '${registration.eventId}'`,
    );
    this.name = "CannotRegisterError";
  }
}

export class SteamFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SteamFailedError";
  }
}
