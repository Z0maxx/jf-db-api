import app from "@/app";
import request from "supertest";
import ctx, { initCtx } from "@/db-context";
import { AllOutEvent } from "@/db-entities/AllOutEvent";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { AllOutEventPreview } from "@/types";

const testEvent = {
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

const eventsToDelete: AllOutEvent[] = [];
describe("GET /all-out/events", () => {
  before(async () => {
    await initCtx();
    ctx.orm.em = ctx.em.fork();
  });

  after(async () => {
    eventsToDelete.forEach((e) => ctx.em.remove(e));
    await ctx.saveAsync();
    await ctx.orm.close(true);
  });

  it("returns event previews", async () => {
    const event = ctx.allOut.events.create(testEvent);
    eventsToDelete.push(event);
    await ctx.saveAsync();

    const res = await request(app).get("/all-out/events");

    assert(res.ok);
    const returnedEvent = (res.body as AllOutEventPreview[]).find((e) => e.id === event.id);
    assert.notEqual(returnedEvent, null);
    assert.deepStrictEqual(returnedEvent, {
      id: event.id,
      start: testEvent.stage1Start.toISOString(),
      end: testEvent.stage3End.toISOString(),
    });
  });
});
