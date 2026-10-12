import { app } from "#/app";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testAllOutEvent } from "./all-out-test-entities";

function request() {
  return supertest(app).get("/all-out/events");
}

describe("GET /all-out/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event previews", async () => {
    const res = await request();

    assert(res.ok);
    assert.deepStrictEqual(res.body, [
      {
        id: testAllOutEvent.id,
        canceled: false,
        start: testAllOutEvent.stage1Start.toISOString(),
        end: testAllOutEvent.stage3End.toISOString(),
      },
    ]);
  });
});
