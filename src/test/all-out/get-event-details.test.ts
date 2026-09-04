import app from "@/app";
import request from "supertest";
import ctx, { initCtx } from "@/db-context";
import { AllOutEvent } from "@/db-entities/AllOutEvent";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { AllOutStage1Map } from "@/db-entities/AllOutStage1Map";
import { AllOutStage2Map } from "@/db-entities/AllOutStage2Map";
import { AllOutStage3Map } from "@/db-entities/AllOutStage3Map";

const testEvent = {
  id: 11,
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

const testStage1Map = {
  id: 100,
  name: "jump_stage_1_map",
  timeLimit: 10,
};

const testStage2Map = {
  id: 200,
  name: "jump_stage_2_map",
};

const testStage3Map = {
  id: 300,
  name: "jump_stage_3_map",
};

describe("GET /all-out/events/:eventId", () => {
  before(async () => {
    await initCtx();
    const em = ctx.em.fork();
    const event = em.create(AllOutEvent, testEvent);
    em.create(AllOutStage1Map, {
      ...testStage1Map,
      event,
    });

    em.create(AllOutStage2Map, {
      ...testStage2Map,
      event,
    });

    em.create(AllOutStage3Map, {
      ...testStage3Map,
      event,
    });

    await em.flush();
  });

  it("returns event details", async () => {
    const res = await request(app).get("/all-out/events/" + testEvent.id);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      id: testEvent.id,
      description: testEvent.description,
      stage1: {
        description: testEvent.stage1Description,
        start: testEvent.stage1Start.toISOString(),
        end: testEvent.stage1End.toISOString(),
        maps: [testStage1Map],
      },
      stage2: {
        description: testEvent.stage2Description,
        start: testEvent.stage2Start.toISOString(),
        end: testEvent.stage2End.toISOString(),
        maps: [testStage2Map],
      },
      stage3: {
        description: testEvent.stage3Description,
        start: testEvent.stage3Start.toISOString(),
        end: testEvent.stage3End.toISOString(),
        maps: [testStage3Map],
      },
    });
  });

  after(async () => {
    const em = ctx.em.fork();
    em.remove(await em.findOneOrFail(AllOutEvent, { id: testEvent.id }));
    await em.flush();
    await ctx.orm.close(true);
  });
});
