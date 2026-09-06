import app from "@/app";
import request from "supertest";
import ctx, { initCtx } from "@/db-context";
import { AllOutEvent } from "@/db-entities/AllOutEvent";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { AllOutParticipant } from "@/db-entities/AllOutParticipant";
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

const testParticipant = {
  steamId64: "76561198138925802",
  division: "bronze soldier",
};

const eventsToDelete: AllOutEvent[] = [];
let em: EntityManager = null!;
describe("GET /all-out/event/:eventId/participants", () => {
  before(async () => {
    await initCtx();
    em = ctx.em.fork();
  });

  after(async () => {
    eventsToDelete.forEach((e) => em.remove(e));
    await em.flush();
    await ctx.orm.close(true);
  });

  it("returns event participants", async () => {
    const event = em.create(AllOutEvent, testEvent);
    eventsToDelete.push(event);
    em.create(AllOutParticipant, {
      ...testParticipant,
      event,
    });
    await em.flush();

    const res = await request(app).get(`/all-out/events/${event.id}/participants`);

    assert(res.ok);
    assert.notEqual(res.body, null);
    assert.equal(res.body.length, 1);
    const steamUser = res.body[0];
    assert.deepStrictEqual(Object.keys(steamUser), ["steamId64", "name", "avatar"]);
    assert.equal(steamUser.steamId64, testParticipant.steamId64);
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await request(app).get(`/all-out/events/${100_000}/participants`);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, new EventNotFoundError(100_000).message);
  });
});
