import { Response } from "express";

import { envConfig } from "./env-config";

export function initSse(response: Response) {
  const sse = {
    onClose: () => {},
    send(event: string, data: object | string) {
      const strData = typeof data === "string" ? data : JSON.stringify(data);
      response.write(`event: ${event}\n`);
      response.write(`data: ${strData}\n\n`);
    },
    close() {
      this.onClose();
      response.end();
    },
  };

  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Access-Control-Allow-Origin", envConfig.CORS_ALLOW_ORIGIN);
  response.setHeader("Connection", "keep-alive");
  response.addListener("close", () => {
    sse.close();
  });

  response.flushHeaders();
  return sse;
}
