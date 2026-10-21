import "dotenv/config";
import { fetchEventSource, FetchEventSourceInit } from "@microsoft/fetch-event-source";
import { BaseEntity } from "@mikro-orm/core";
import { Server } from "node:http";
import request from "supertest";

import { app } from "#/app";
import { authService } from "#/auth/auth.service";
import { ctx, initCtx } from "#/db-context";
import { User } from "#/db-entities/User";
import { seedEntitiesAsync } from "#/default-entities";

import { createAllOutTestEntitiesAsync } from "./all-out/all-out-test-entities";
import { createLanTestEntitiesAsync } from "./lan/lan-test-entities";
import { createTestEntitiesAsync } from "./test-entities";

export async function setupApiTestSuiteAsync() {
  await initCtx();
  await seedEntitiesAsync();
  await createTestEntitiesAsync();
  await createAllOutTestEntitiesAsync();
  await createLanTestEntitiesAsync();
}

export async function teardownApiTestSuiteAsync(entitiesToDelete: BaseEntity[] = []) {
  await Promise.all(
    entitiesToDelete.map(async (e) => {
      ctx.em.remove(e);
      await ctx.saveAsync();
    }),
  );

  ctx.orm.close(true);
}

export function loginAs(user: User, req: request.Test): request.Test {
  return req.set("Authorization", "Bearer " + authService.getToken({ id: user.id }));
}

export async function getSingleSseResponseAsync(
  url: string,
  {
    body,
    method,
    headers,
  }: {
    body?: object | undefined;
    method?: RequestInit["method"];
    headers?: FetchEventSourceInit["headers"];
  } = {},
) {
  return (await getSSeResponsesAsync(url, { responseCount: 1, body, method, headers }))[0];
}

export function getSSeResponsesAsync(
  url: string,
  {
    responseCount,
    body,
    method,
    headers,
  }: {
    responseCount: number;
    body?: object | undefined;
    method?: RequestInit["method"];
    headers?: FetchEventSourceInit["headers"];
  },
) {
  const ac = new AbortController();
  return new Promise<any[]>(async (res) => {
    let i = 0;
    const responses: any[] = [];
    await fetchEventSource(url, {
      signal: ac.signal,
      method: method ?? "GET",
      headers: headers ?? {},
      body: body ? JSON.stringify(body) : null,
      onmessage(ev) {
        i++;
        responses.push(JSON.parse(ev.data));
        if (i === responseCount) {
          res(responses);
          ac.abort();
        }
      },
      onerror(err) {
        console.log(err);
      },
    });
  });
}

export function createServerAsync(port: number) {
  return new Promise<Server>((res) => {
    const s = app.listen(port, () => {
      res(s);
    });
  });
}
