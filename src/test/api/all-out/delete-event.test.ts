import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventNotFoundError, EventStartedInPastError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { tomorrow, yesterday } from "#/test/test-dates";

import { testHeadAdmin, testSoldierDivision, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

function request(id: number) {
  return supertest(app).delete("/all-out/events/" + id);
}

const entities: BaseEntity[] = [];
describe("DELETE /all-out/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("deletes event, its maps and participants", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "description",
      stage1Start: new Date(`${tomorrow} 10:00`),
      stage1End: new Date(`${tomorrow} 11:00`),
      stage2Start: new Date(`${tomorrow} 12:00`),
      stage2End: new Date(`${tomorrow} 13:00`),
      stage3Start: new Date(`${tomorrow} 14:00`),
      stage3End: new Date(`${tomorrow} 15:00`),
    });
    entities.push(event);
    await ctx.allOut.stage1Maps.upsert({
      name: "stage 1 soldier map",
      division: testSoldierDivision,
      timeLimit: 10,
      event,
    });
    await ctx.allOut.stage2Maps.upsert({
      name: "stage 2 soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.allOut.stage3Maps.upsert({
      name: "stage 3 soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.allOut.participants.upsert({
      user: testUser1,
      event,
    });

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert(res.ok);
    const deletedEvent = await ctx.allOut.events.findOne({ id: event.id });
    assert.notExists(deletedEvent?.id);
    const deletedStage1Maps = await ctx.allOut.stage1Maps.find({ event });
    assert.isEmpty(deletedStage1Maps);
    const deletedStage2Maps = await ctx.allOut.stage2Maps.find({ event });
    assert.isEmpty(deletedStage2Maps);
    const deletedStage3Maps = await ctx.allOut.stage3Maps.find({ event });
    assert.isEmpty(deletedStage3Maps);
    const deletedParticipants = await ctx.allOut.participants.find({ event });
    assert.isEmpty(deletedParticipants);
  });

  it("returns event started in past error when trying to delete an event that started in the past", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "description",
      stage1Start: new Date(`${yesterday} 10:00`),
      stage1End: new Date(`${yesterday} 11:00`),
      stage2Start: new Date(`${yesterday} 12:00`),
      stage2End: new Date(`${yesterday} 13:00`),
      stage3Start: new Date(`${yesterday} 14:00`),
      stage3End: new Date(`${yesterday} 15:00`),
      stage1Description: "stage 1 description",
      stage2Description: "stage 2 description",
      stage3Description: "stage 3 description",
    });
    entities.push(event);

    const res = await loginAs(testHeadAdmin, request(event.id));

    assert.equal(res.status, 403);
    assert.deepStrictEqual(
      res.body,
      getAppError(new EventStartedInPastError(event.id, event.stage1Start)),
    );
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(testHeadAdmin, request(200000));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });
});
