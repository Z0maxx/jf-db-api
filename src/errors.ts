import { Registration } from "./types";

export abstract class AppError extends Error {
  httpCode: number;
  messages: string[] = [];
  constructor(httpCode: number) {
    super();
    this.httpCode = httpCode;
  }
}

export class ValidationError extends AppError {
  constructor(messages: string[]) {
    super(400);
    this.messages = messages;
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor() {
    super(404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor() {
    super(409);
    this.name = "ConflictError";
  }
}

export class BadGatewayError extends AppError {
  constructor() {
    super(502);
    this.name = "BadGatewayError";
  }
}

export class NotFoundByIdError extends NotFoundError {
  constructor(entity: string, id: number | string) {
    super();
    this.message = `${entity} with id '${id}' not found`;
    this.name = "NotFoundByIdError";
  }
}

export class NotFoundByIdsError extends NotFoundError {
  constructor(entity: string, ids: (number | string)[]) {
    super();
    this.messages = ids.map((id) => `${entity} with id '${id}' not found`);
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
    super();
    this.message = `Registration for user with id '${registration.userId}' not found to event with id '${registration.eventId}'`;
    this.name = "RegistrationNotFoundError";
  }
}

export class SteamUsersNotFoundError extends NotFoundByIdsError {
  constructor(steamId64s: string[]) {
    super("Steam user", steamId64s);
    this.name = "SteamUsersNotFoundError";
  }
}

export class DivisionsNotFoundError extends NotFoundByIdsError {
  constructor(divisionIds: number[]) {
    super("Division", divisionIds);
    this.name = "DivisionsNotFoundError";
  }
}

export class ClaimsNotFoundError extends NotFoundByIdsError {
  constructor(claimIds: number[]) {
    super("Claim", claimIds);
    this.name = "ClaimsNotFoundError";
  }
}

export class DefaultEntitiesModifiedError extends ForbiddenError {
  constructor(entity: string, names: string[]) {
    super();
    this.messages = names.map((n) => `Cannot modify default ${entity} '${n}'`);
    this.name = "DefaultEntitiesModifiedError";
  }
}

export class DefaultEntitiesDeletedError extends ForbiddenError {
  constructor(entity: string, names: string[]) {
    super();
    this.messages = names.map((n) => `Cannot delete default ${entity} '${n}'`);
    this.name = "DefaultEntitiesDeletedError";
  }
}

export class NoMapsWithUserDivisionsError extends ForbiddenError {
  constructor(eventId: number, userId: number) {
    super();
    this.message = `Event with id '${eventId}' has no maps that match the divisions of user with id '${userId}'`;
    this.name = "NoMapsWithUserDivisionsError";
  }
}

export class EventStartedInPastError extends ForbiddenError {
  constructor(eventId: number, startedAt: Date) {
    super();
    this.message = `Event with id '${eventId}' started at ${startedAt.toUTCString()}`;
    this.name = "EventStartedInPastError";
  }
}

export class EventEndedError extends ForbiddenError {
  constructor(eventId: number, endedAt: Date) {
    super();
    this.message = `Event with id '${eventId}' ended at ${endedAt.toUTCString()}`;
    this.name = "EventEndedError";
  }
}

export class DivisionsHaveUsersError extends ForbiddenError {
  constructor(divisionNames: string[]) {
    super();
    this.messages = divisionNames.map((d) => `Division '${d}' has users`);
    this.name = "DivisionsHaveUsersError";
  }
}

export class RolesHaveUsersError extends ForbiddenError {
  constructor(roleNames: string[]) {
    super();
    this.messages = roleNames.map((r) => `Role '${r}' has users`);
    this.name = "RolesHaveUsersError";
  }
}

export class UnassignedDivisionsDeletedError extends DefaultEntitiesDeletedError {
  constructor(divisionNames: string[]) {
    super("Division", divisionNames);
    this.name = "UnassignedDivisionsDeletedError";
  }
}

export class DefaultRolesDeletedError extends DefaultEntitiesDeletedError {
  constructor(roleNames: string[]) {
    super("Role", roleNames);
    this.name = "DefaultRolesDeletedError";
  }
}

export class DefaultRolesModifiedError extends DefaultEntitiesModifiedError {
  constructor(roleNames: string[]) {
    super("Role", roleNames);
    this.name = "DefaultRolesModifiedError";
  }
}

export class AlreadyRegisteredError extends ConflictError {
  constructor(registration: Registration) {
    super();
    this.message = `User with id '${registration.userId}' has already registered to event with id '${registration.eventId}'`;
    this.name = "AlreadyRegisteredError";
  }
}

export class SteamFailedError extends BadGatewayError {
  constructor(message: string) {
    super();
    this.message = message;
    this.name = "SteamFailedError";
  }
}
