import { BaseEntity } from "@mikro-orm/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { ctx } from "#/db-context";
import { testHeadAdmin, testSoldierDivision, testUser1 } from "../test-entities";
import { app } from "#/app";
import request from "supertest";
import { EventNotFoundError, EventStartedInPastError } from "#/errors";
import { tomorrow, yesterday } from "#/test/test-dates";

const entities: BaseEntity[] = [];
describe("DELETE /all-out/entities/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("deletes event, its maps and participants", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);
    await ctx.allOut.stage1Maps.upsert({
      name: "test stage 1 soldier map",
      division: testSoldierDivision,
      timeLimit: 10,
      event,
    });
    await ctx.allOut.stage2Maps.upsert({
      name: "test stage 2 soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.allOut.stage3Maps.upsert({
      name: "test stage 3 soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.allOut.participants.upsert({
      user: testUser1,
      event,
    });

    const res = await loginAs(request(app).delete("/all-out/events/" + event.id), testHeadAdmin);

    assert(res.ok);
    const deletedEvent = await ctx.allOut.events.findOne({ id: event.id });
    assert.equal(deletedEvent, null);
    const deletedStage1Maps = await ctx.allOut.stage1Maps.find({ event });
    assert.equal(deletedStage1Maps.length, 0);
    const deletedStage2Maps = await ctx.allOut.stage2Maps.find({ event });
    assert.equal(deletedStage2Maps.length, 0);
    const deletedStage3Maps = await ctx.allOut.stage3Maps.find({ event });
    assert.equal(deletedStage3Maps.length, 0);
    const deletedParticipants = await ctx.allOut.participants.find({ event });
    assert.equal(deletedParticipants.length, 0);
  });

  it("returns event started in past error when trying to delete an event that started in the past", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(`${yesterday} 10:00`),
      stage1End: new Date(`${yesterday} 11:00`),
      stage2Start: new Date(`${yesterday} 12:00`),
      stage2End: new Date(`${yesterday} 13:00`),
      stage3Start: new Date(`${yesterday} 14:00`),
      stage3End: new Date(`${yesterday} 15:00`),
      stage1Description: "test stage 1 description",
      stage2Description: "test stage 2 description",
      stage3Description: "test stage 3 description",
    });
    entities.push(event);

    const res = await loginAs(request(app).delete("/all-out/events/" + event.id), testHeadAdmin);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventStartedInPastError",
      errorMessage: new EventStartedInPastError(event.id, event.stage1Start).message,
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(request(app).delete("/all-out/events/200000"), testHeadAdmin);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });
});
