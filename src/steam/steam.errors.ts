import { NotFoundByIdsError } from "#/errors";

export class SteamUsersNotFoundError extends NotFoundByIdsError {
  constructor(steam64Ids: string[]) {
    super("Steam user", steam64Ids);
    this.name = "SteamUsersNotFoundError";
  }
}
