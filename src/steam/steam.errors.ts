import { BadGatewayError, NotFoundByIdsError } from "#/errors";

export class SteamUsersNotFoundError extends NotFoundByIdsError {
  constructor(steam64Ids: string[]) {
    super("Steam user", steam64Ids);
    this.name = "SteamUsersNotFoundError";
  }
}

export class SteamIsDownError extends BadGatewayError {
  constructor() {
    super();
    this.message = "Steam API is down";
    this.name = "SteamIsDownError";
  }
}
