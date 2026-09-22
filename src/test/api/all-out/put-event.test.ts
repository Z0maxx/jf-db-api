import { ctx } from "#/db-context";
import { BaseEntity } from "@mikro-orm/core";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { app } from "#/app";
import { testHeadAdmin, testSoldierDivision, testUser1 } from "../test-entities";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { DivisionsNotFoundError, EventNotFoundError } from "#/errors";
import { tomorrow, yesterday } from "#/test/test-dates";
import { allOutScheduleValidator } from "#/all-out/validators/all-out-schedule.validator";
import { allOutUpdatedDatesValidator } from "#/all-out/validators/all-out-updated-dates.validator";
import { allOutDuplicateMapValidator } from "#/all-out/validators/all-out-duplicate-map.validator";

const entities: BaseEntity[] = [];
describe("PUT /all-out/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("updates event", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    await ctx.allOut.stage2Maps.upsert({
      name: "test stage 2 soldier map",
      event: originalEvent,
      division: testSoldierDivision,
    });
    await ctx.allOut.stage3Maps.upsert({
      name: "test stage 3 soldier map",
      event: originalEvent,
      division: testSoldierDivision,
    });
    const event = {
      id: originalEvent.id,
      description: "test updated event description",
      stage1: {
        start: new Date(`${tomorrow} 16:00`),
        end: new Date(`${tomorrow} 17:00`),
        description: "test updated stage 1 description",
        maps: [
          {
            name: "test created stage 1 soldier map",
            divisionId: testSoldierDivision.id,
            timeLimit: 20,
          },
        ],
      },
      stage2: {
        start: new Date(`${tomorrow} 18:00`),
        end: new Date(`${tomorrow} 19:00`),
        description: "test updated stage 2 description",
        maps: [
          {
            name: "test updated stage 2 soldier map",
            divisionId: testSoldierDivision.id,
          },
        ],
      },
      stage3: {
        start: new Date(`${tomorrow} 20:00`),
        end: new Date(`${tomorrow} 21:00`),
        description: "test updated stage 3 description",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert(res.ok);
    const updatedEvent = await ctx.allOut.events.findOne({ id: event.id });
    assert.isNotNull(updatedEvent);
    assert.containsSubset(updatedEvent!.serialize(), {
      description: event.description,

      stage1Start: event.stage1.start,
      stage1End: event.stage1.end,
      stage1Description: event.stage1.description,

      stage2Start: event.stage2.start,
      stage2End: event.stage2.end,
      stage2Description: event.stage2.description,

      stage3Start: event.stage3.start,
      stage3End: event.stage3.end,
      stage3Description: event.stage3.description,
    });
    const createdStage1Maps = await ctx.allOut.stage1Maps.find({ event: event.id });
    assert.equal(createdStage1Maps.length, 1);
    assert.containsSubset(createdStage1Maps[0].serialize(), {
      name: event.stage1.maps[0].name,
      timeLimit: event.stage1.maps[0].timeLimit,
      division: event.stage1.maps[0].divisionId,
    });
    const updatedStage2Maps = await ctx.allOut.stage2Maps.find({ event: event.id });
    assert.equal(updatedStage2Maps.length, 1);
    assert.containsSubset(updatedStage2Maps[0].serialize(), {
      name: event.stage2.maps[0].name,
      division: event.stage2.maps[0].divisionId,
    });
    const deletedStage3Maps = await ctx.allOut.stage3Maps.find({ event: event.id });
    assert.isEmpty(deletedStage3Maps);
  });

  it("deletes participant and its divisions when there are no longer any maps with user's divisions", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    entities.push(
      await ctx.allOut.stage2Maps.upsert({
        name: "test stage 2 soldier map",
        event: originalEvent,
        division: testSoldierDivision,
      }),
    );
    const participant = await ctx.allOut.participants.upsert({
      user: testUser1,
      event: originalEvent,
    });
    participant.divisionCollection.set([testSoldierDivision]);
    await ctx.saveAsync();
    const otherDivision = await ctx.divisions.upsert({
      name: "other division",
      color: "000000",
    });
    entities.push(otherDivision);
    const event = {
      id: originalEvent.id,
      description: "test updated event description",
      stage1: {
        start: originalEvent.stage1Start,
        end: originalEvent.stage1End,
        description: "",
        maps: [],
      },
      stage2: {
        start: originalEvent.stage2Start,
        end: originalEvent.stage2End,
        description: "",
        maps: [
          {
            name: "test updated stage 2 soldier map",
            divisionId: otherDivision.id,
          },
        ],
      },
      stage3: {
        start: originalEvent.stage3Start,
        end: originalEvent.stage3End,
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert.ok(res.status);
    const deletedParticipant = await ctx.allOut.participants.findOne({
      user: testUser1,
      event: event.id,
    });
    assert.notExists(deletedParticipant?.id);
  });

  it("returns validation error when stage times are out of order", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    const event = {
      id: originalEvent.id,
      description: "test description",
      stage1: {
        start: new Date(`${tomorrow} 16:00`),
        end: new Date(`${tomorrow} 15:00`),
        description: "",
        maps: [],
      },
      stage2: {
        start: new Date(`${tomorrow} 14:00`),
        end: new Date(`${tomorrow} 19:00`),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date(`${tomorrow} 20:00`),
        end: new Date(`${tomorrow} 21:00`),
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put(`/all-out/events`), testHeadAdmin).send(event);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: allOutScheduleValidator.getMessages([
        { earlier: "Stage 1 start time", later: "Stage 1 end time" },
        { earlier: "Stage 1 start time", later: "Stage 2 start time" },
        { earlier: "Stage 1 end time", later: "Stage 2 start time" },
      ]),
    });
  });

  it("returns validation error when updated stage times are in the past and not the same as current date", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    const event = {
      id: originalEvent.id,
      description: "test description",
      stage1: {
        start: new Date(`${yesterday} 08:00`),
        end: new Date(`${yesterday} 09:00`),
        maps: [],
      },
      stage2: {
        start: new Date(`${yesterday} 12:00`),
        end: new Date(`${yesterday} 13:00`),
        maps: [],
      },
      stage3: {
        start: new Date(`${yesterday} 14:00`),
        end: new Date(`${yesterday} 15:00`),
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: allOutUpdatedDatesValidator.getMessages([
        { stage: 1, invalidDateFields: ["start", "end"] },
      ]),
    });
  });

  it("returns validation error when there are duplicate maps with same division in a stage", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    const event = {
      id: originalEvent.id,
      description: "test description",
      stage1: {
        start: new Date(`${tomorrow} 10:00`),
        end: new Date(`${tomorrow} 11:00`),
        maps: [
          {
            name: "stage 1 duplicate map",
            timeLimit: 10,
            divisionId: testSoldierDivision.id,
          },
          {
            name: "stage 1 duplicate map",
            timeLimit: 10,
            divisionId: testSoldierDivision.id,
          },
        ],
      },
      stage2: {
        start: new Date(`${tomorrow} 12:00`),
        end: new Date(`${tomorrow} 13:00`),
        maps: [
          {
            name: "stage 2 duplicate map",
            divisionId: testSoldierDivision.id,
          },
          {
            name: "stage 2 duplicate map",
            divisionId: testSoldierDivision.id,
          },
        ],
      },
      stage3: {
        start: new Date(`${tomorrow} 14:00`),
        end: new Date(`${tomorrow} 15:00`),
        maps: [
          {
            name: "stage 3 duplicate map",
            divisionId: testSoldierDivision.id,
          },
          {
            name: "stage 3 duplicate map",
            divisionId: testSoldierDivision.id,
          },
        ],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: allOutDuplicateMapValidator.getMessages([
        { stage: 1, duplicates: [event.stage1.maps[0]] },
        { stage: 2, duplicates: [event.stage2.maps[0]] },
        { stage: 3, duplicates: [event.stage3.maps[0]] },
      ]),
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const event = {
      id: 200_000,
      description: "test description",
      stage1: {
        start: new Date(`${tomorrow} 16:00`),
        end: new Date(`${tomorrow} 17:00`),
        description: "",
        maps: [],
      },
      stage2: {
        start: new Date(`${tomorrow} 18:00`),
        end: new Date(`${tomorrow} 19:00`),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date(`${tomorrow} 20:00`),
        end: new Date(`${tomorrow} 21:00`),
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put(`/all-out/events`), testHeadAdmin).send(event);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(event.id).message,
    });
  });

  it("returns divisions not found error when divisions don't exist", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    const event = {
      id: originalEvent.id,
      description: "test description",
      stage1: {
        start: originalEvent.stage1Start,
        end: originalEvent.stage1End,
        description: "",
        maps: [
          {
            name: "jump_map_1",
            divisionId: 200_001,
            timeLimit: 21,
          },
          {
            name: "jump_map_2",
            divisionId: 200_002,
            timeLimit: 22,
          },
        ],
      },
      stage2: {
        start: originalEvent.stage2Start,
        end: originalEvent.stage2End,
        description: "",
        maps: [],
      },
      stage3: {
        start: originalEvent.stage3Start,
        end: originalEvent.stage3End,
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "DivisionsNotFoundError",
      errorMessages: new DivisionsNotFoundError([200_001, 200_002]).messages,
    });
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send({});

    assert.equal(res.status, 400);
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).put("/all-out/events");

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(request(app).put("/all-out/events"), testUser1);

    assert.equal(res.status, 403);
  });
});
