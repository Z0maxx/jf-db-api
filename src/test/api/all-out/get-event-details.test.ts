import app from "@/app";
import request from "supertest";
import ctx, { initCtx } from "@/db-context";
import { AllOutEvent } from "@/db-entities/AllOutEvent";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { AllOutStage1Map } from "@/db-entities/AllOutStage1Map";
import { AllOutStage2Map } from "@/db-entities/AllOutStage2Map";
import { AllOutStage3Map } from "@/db-entities/AllOutStage3Map";
import { EntityManager } from "@mikro-orm/core";
import { EventNotFoundError } from "@/errors";

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

const testStage1Map = {
  name: "jump_stage_1_map",
  timeLimit: 10,
};

const testStage2Map = {
  name: "jump_stage_2_map",
};

const testStage3Map = {
  name: "jump_stage_3_map",
};

const eventsToDelete: AllOutEvent[] = [];
let em: EntityManager = null!;
describe("GET /all-out/events/:eventId", () => {
  before(async () => {
    await initCtx();
    em = ctx.em.fork();
  });

  after(async () => {
    eventsToDelete.forEach((e) => em.remove(e));
    await em.flush();
    await ctx.orm.close(true);
  });

  it("returns event details", async () => {
    const event = em.create(AllOutEvent, testEvent);
    eventsToDelete.push(event);
    const stage1Map = em.create(AllOutStage1Map, {
      ...testStage1Map,
      event,
    });
    const stage2Map = em.create(AllOutStage2Map, {
      ...testStage2Map,
      event,
    });
    const stage3Map = em.create(AllOutStage3Map, {
      ...testStage3Map,
      event,
    });
    await em.flush();

    const res = await request(app).get("/all-out/events/" + event.id);

    assert(res.ok);
    assert.deepStrictEqual(res.body, {
      id: event.id,
      description: testEvent.description,
      stage1: {
        description: testEvent.stage1Description,
        start: testEvent.stage1Start.toISOString(),
        end: testEvent.stage1End.toISOString(),
        maps: [
          {
            id: stage1Map.id,
            ...testStage1Map,
          },
        ],
      },
      stage2: {
        description: testEvent.stage2Description,
        start: testEvent.stage2Start.toISOString(),
        end: testEvent.stage2End.toISOString(),
        maps: [
          {
            id: stage2Map.id,
            ...testStage2Map,
          },
        ],
      },
      stage3: {
        description: testEvent.stage3Description,
        start: testEvent.stage3Start.toISOString(),
        end: testEvent.stage3End.toISOString(),
        maps: [
          {
            id: stage3Map.id,
            ...testStage3Map,
          },
        ],
      },
    });
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await request(app).get("/all-out/events/" + 100_000);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, new EventNotFoundError(100_000).message);
  });
});
