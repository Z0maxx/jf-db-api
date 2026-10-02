import "dotenv/config";
import { authService } from "#/auth/auth.service";
import { ctx, initCtx } from "#/db-context";
import { User } from "#/db-entities/User";
import { seedEntitiesAsync } from "#/default-entities";
import { fetchEventSource, FetchEventSourceInit } from "@microsoft/fetch-event-source";
import { BaseEntity } from "@mikro-orm/core";
import request from "supertest";

import { createAllOutTestEntitiesAsync } from "./all-out/all-out-test-entities";
import { createTestEntitiesAsync } from "./test-entities";

export async function setupApiTestSuiteAsync() {
  await initCtx();
  await seedEntitiesAsync();
  ctx.orm.em = ctx.em.fork();
  await createTestEntitiesAsync();
  await createAllOutTestEntitiesAsync();
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

export function getSingleSseResponseAsync(
  url: string,
  {
    body,
    method,
    headers,
  }: {
    body?: object;
    method: RequestInit["method"];
    headers: FetchEventSourceInit["headers"];
  },
) {
  const ac = new AbortController();
  return new Promise<any>(async (res) => {
    await fetchEventSource(url, {
      signal: ac.signal,
      method: method ?? "GET",
      headers: headers ?? {},
      body: body ? JSON.stringify(body) : "",
      onmessage(ev) {
        res(JSON.parse(ev.data));
        ac.abort();
      },
    });
  });
}
