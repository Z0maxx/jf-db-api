import { app } from "@/app";
import request from "supertest";
import { ctx } from "@/db-context";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { AllOutEventPreview } from "@/types";
import { initAllOutTestsAsync } from "./all-out-util";
import { testAllOutEvent } from "./test-all-out-entities";

describe("GET /all-out/events", () => {
  before(async () => {
    await initAllOutTestsAsync();
  });

  after(async () => {
    await ctx.orm.close(true);
  });

  it("returns event previews", async () => {
    const res = await request(app).get("/all-out/events");

    assert(res.ok);
    const returnedEvent = (res.body as AllOutEventPreview[]).find(
      (e) => e.id === testAllOutEvent.id,
    );
    assert.notEqual(returnedEvent, null);
    assert.deepStrictEqual(returnedEvent, {
      id: testAllOutEvent.id,
      start: testAllOutEvent.stage1Start.toISOString(),
      end: testAllOutEvent.stage3End.toISOString(),
    });
  });
});
