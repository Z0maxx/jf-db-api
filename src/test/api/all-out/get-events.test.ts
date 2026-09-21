import { app } from "#/app";
import request from "supertest";
import { testAllOutEvent } from "./all-out-test-entities";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

describe("GET /all-out/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event previews", async () => {
    const res = await request(app).get("/all-out/events");

    assert(res.ok);
    const returnedEvent = (res.body as any[]).find((e) => e.id === testAllOutEvent.id);
    assert.isNotNull(returnedEvent);
    assert.deepStrictEqual(returnedEvent, {
      id: testAllOutEvent.id,
      canceled: false,
      start: testAllOutEvent.stage1Start.toISOString(),
      end: testAllOutEvent.stage3End.toISOString(),
    });
  });
});
