import { Registration } from "./types";

export abstract class AppError extends Error {
  httpCode: number;
  constructor(message: string, httpCode: number) {
    super(message);
    this.httpCode = httpCode;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class BadGatewayError extends AppError {
  constructor(message: string) {
    super(message, 502);
    this.name = "BadGatewayError";
  }
}

export class NotFoundByIdError extends NotFoundError {
  constructor(entity: string, id: number | string) {
    super(`${entity} with id '${id}' not found`);
    this.name = "NotFoundByIdError";
  }
}

export class NotFoundByIdsError extends NotFoundError {
  constructor(entities: string, ids: (number | string)[]) {
    const idsStr = `'${ids.join("', '")}'`;
    super(`${entities} with ids ${idsStr} not found`);
    this.name = "NotFoundByIdsError";
  }
}

export class EventNotFoundError extends NotFoundByIdError {
  constructor(eventId: number) {
    super("Event", eventId);
    this.name = "EventNotFoundError";
  }
}

export class MapNotFoundError extends NotFoundByIdError {
  constructor(mapId: number) {
    super("Map", mapId);
    this.name = "MapNotFoundError";
  }
}

export class RegistrationNotFoundError extends NotFoundError {
  constructor(registration: Registration) {
    super(
      `Registration for user with id '${registration.userId}' is not found to event with id '${registration.eventId}'`,
    );
    this.name = "RegistrationNotFoundError";
  }
}

export class SteamUsersNotFoundError extends NotFoundByIdsError {
  constructor(steamId64s: string[]) {
    super("Steam users", steamId64s);
    this.name = "SteamUsersNotFoundError";
  }
}

export class DivisionsNotFoundError extends NotFoundByIdsError {
  constructor(divisionIds: number[]) {
    super("Divisions", divisionIds);
    this.name = "DivisionsNotFoundError";
  }
}

export class CannotRegisterError extends ForbiddenError {
  constructor(registration: Registration) {
    super(
      `User with id '${registration.userId}' cannot register to event with id '${registration.eventId}'`,
    );
    this.name = "CannotRegisterError";
  }
}

export class AlreadyRegisteredError extends ConflictError {
  constructor(registration: Registration) {
    super(
      `User with id '${registration.userId}' has already registered to event with id '${registration.eventId}'`,
    );
    this.name = "AlreadyRegisteredError";
  }
}

export class EventAlreadyStartedError extends ForbiddenError {
  constructor(eventId: number) {
    super(`Event with id '${eventId}' has already started`);
  }
}

export class SteamFailedError extends BadGatewayError {
  constructor(message: string) {
    super(message);
    this.name = "SteamFailedError";
  }
}
