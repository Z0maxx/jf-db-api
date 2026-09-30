import { Response } from "express";

import { envConfig } from "./env-config";

export function initSse(response: Response) {
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Access-Control-Allow-Origin", envConfig.CORS_ALLOW_ORIGIN);
  response.setHeader("Connection", "keep-alive");
  response.addListener("close", () => response.end());
  response.flushHeaders();

  return {
    send(event: string, data: object | string) {
      const strData = typeof data === "string" ? data : JSON.stringify(data);
      response.write(`event: ${event}\n`);
      response.write(`data: ${strData}\n\n`);
    },
    close() {
      response.end();
    },
  };
}
