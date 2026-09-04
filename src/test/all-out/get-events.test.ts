import app from "@/app";
import request from "supertest";
import ctx, { initCtx } from "@/db-context";
import { AllOutEvent } from "@/db-entities/AllOutEvent";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";

const testEvent = {
  id: 10,
  description: "test description",
  stage1Start: new Date("2030-01-01 10:00"),
  stage1End: new Date("2030-01-01 16:00"),
  stage2Start: new Date("2030-01-02 10:00"),
  stage2End: new Date("2030-01-02 16:00"),
  stage3Start: new Date("2030-01-03 10:00"),
  stage3End: new Date("2030-01-03 16:00"),
  stage1Description: "test stage 1 description",
  stage2Description: "test stage 2 description",
  stage3Description: "test stage 3 description",
};

describe("GET /all-out/events", () => {
  before(async () => {
    await initCtx();
    const em = ctx.em.fork();
    await em.upsert(AllOutEvent, testEvent);
  });

  it("returns event previews", async () => {
    const res = await request(app).get("/all-out/events");
    assert.equal(res.statusCode, 200);
    const event = (res.body as any[]).find((e) => e.id === testEvent.id);
    assert.notEqual(event, null);
    assert.deepEqual(event, {
      id: testEvent.id,
      start: testEvent.stage1Start.toISOString(),
      end: testEvent.stage3End.toISOString(),
    });
  });

  after(async () => {
    const em = ctx.em.fork();
    em.remove(await em.findOneOrFail(AllOutEvent, { id: testEvent.id }));
    await em.flush();
    await ctx.orm.close(true);
  });
});
