import { BadGatewayError } from "#/errors";

export class TempusIsDownError extends BadGatewayError {
  constructor() {
    super();
    this.message = "Tempus API is down";
    this.name = "TempusIsDownError";
  }
}
