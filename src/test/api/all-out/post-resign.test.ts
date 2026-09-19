import { app } from "#/app";
import request from "supertest";
import { ctx } from "#/db-context";
import { BaseEntity } from "@mikro-orm/core";
import { testSoldierDivision, testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { EventEndedError, EventNotFoundError, RegistrationNotFoundError } from "#/errors";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { tomorrow, yesterday } from "#/test/test-dates";

const entities: BaseEntity[] = [];
describe("POST /all-out/events/:eventId/resign", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("deletes participant and participant divisions when event has not started", async () => {
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
      timeLimit: 10,
      event,
      division: testSoldierDivision,
    });
    const participant = await ctx.allOut.participants.upsert({
      user: testUser1,
      event,
    });
    await ctx.allOut.participantDivisions.upsert({
      participant,
      division: testSoldierDivision,
    });

    const res = await loginAs(request(app).post(`/all-out/events/${event.id}/resign`), testUser1);

    assert(res.ok);
    const deletedParticipant = await ctx.allOut.participants.findOne({ user: testUser1, event });
    assert.equal(deletedParticipant, null);
    const deletedParticipantDivision = await ctx.allOut.participantDivisions.findOne({
      participant,
    });
    assert.equal(deletedParticipantDivision, null);
  });

  it("resigns participant when event has started", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(),
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
      timeLimit: 10,
      event,
      division: testSoldierDivision,
    });
    await ctx.allOut.participants.upsert({
      user: testUser1,
      event,
    });

    const res = await loginAs(request(app).post(`/all-out/events/${event.id}/resign`), testUser1);

    assert(res.ok);
    const resignedParticipant = await ctx.allOut.participants.findOne({ user: testUser1, event });
    assert(resignedParticipant?.resigned);
  });

  it("returns event ended error when trying to resign from an event that has ended", async () => {
    const event = await ctx.allOut.events.upsert({
      description: "test description",
      stage1Start: new Date(),
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
    await ctx.allOut.participants.upsert({
      user: testUser1,
      event,
    });

    const res = await loginAs(request(app).post(`/all-out/events/${event.id}/resign`), testUser1);

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventEndedError",
      errorMessage: new EventEndedError(event.id, event.stage3End).message,
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await loginAs(request(app).post(`/all-out/events/200000/resign`), testUser1);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns registration not found error when registration doesn't exist", async () => {
    const event = await ctx.allOut.events.upsert({
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
    });
    entities.push(event);

    const res = await loginAs(request(app).post(`/all-out/events/${event.id}/resign`), testUser1);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "RegistrationNotFoundError",
      errorMessage: new RegistrationNotFoundError({ userId: testUser1.id, eventId: event.id })
        .message,
    });
  });

  it("returns unauthorized when not logged in", async () => {
    const res = await request(app).post(`/all-out/events/200000/resign`);

    assert.equal(res.status, 401);
  });
});
