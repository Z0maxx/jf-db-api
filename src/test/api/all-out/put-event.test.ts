import { ctx } from "#/db-context";
import { BaseEntity } from "@mikro-orm/core";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { app } from "#/app";
import { testHeadAdmin, testSoldierDivision, testUser1 } from "../test-entities";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { EventNotFoundError } from "#/errors";

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
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 19:00"),
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
        start: new Date("2031-01-02 17:00"),
        end: new Date("2031-01-02 19:00"),
        description: "test updated stage 2 description",
        maps: [
          {
            name: "test updated stage 2 soldier map",
            divisionId: testSoldierDivision.id,
          },
        ],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "test updated stage 3 description",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert(res.ok);
    const updatedEvent = await ctx.allOut.events.findOne({ id: event.id });
    assert.notEqual(updatedEvent, null);
    assert.containSubset(updatedEvent!.serialize(), {
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
    assert.containSubset(createdStage1Maps[0].serialize(), {
      name: event.stage1.maps[0].name,
      timeLimit: event.stage1.maps[0].timeLimit,
      division: event.stage1.maps[0].divisionId,
    });
    const updatedStage2Maps = await ctx.allOut.stage2Maps.find({ event: event.id });
    assert.equal(updatedStage2Maps.length, 1);
    assert.containSubset(updatedStage2Maps[0].serialize(), {
      name: event.stage2.maps[0].name,
      division: event.stage2.maps[0].divisionId,
    });
    const deletedStage3Maps = await ctx.allOut.stage3Maps.find({ event: event.id });
    assert.equal(deletedStage3Maps.length, 0);
  });

  it("deletes participant and its divisions when there are no longer any maps with user's divisions", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    await ctx.allOut.participantDivisions.upsert({
      division: testSoldierDivision,
      participant,
    });
    const otherDivision = await ctx.divisions.upsert({
      name: "other division",
      color: "000000",
    });
    entities.push(otherDivision);
    const event = {
      id: originalEvent.id,
      description: "test updated event description",
      stage1: {
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 19:00"),
        description: "test updated stage 1 description",
        maps: [],
      },
      stage2: {
        start: new Date("2031-01-02 17:00"),
        end: new Date("2031-01-02 19:00"),
        description: "test updated stage 2 description",
        maps: [
          {
            name: "test updated stage 2 soldier map",
            divisionId: otherDivision.id,
          },
        ],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "test updated stage 3 description",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert.ok(res.status);
    const deletedParticipant = await ctx.allOut.participants.findOne({
      user: testUser1,
      event: event.id,
    });
    assert.equal(deletedParticipant, null);
    const deletedParticipantDivisions = await ctx.allOut.participantDivisions.find({ participant });
    assert.equal(deletedParticipantDivisions.length, 0);
  });

  it("returns validation error when stage times are out of order", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    const event1 = {
      id: originalEvent.id,
      description: "test description",
      stage1: {
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 15:00"),
        description: "",
        maps: [],
      },
      stage2: {
        start: new Date("2031-01-02 17:00"),
        end: new Date("2031-01-02 19:00"),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "",
        maps: [],
      },
    };
    const event2 = {
      id: originalEvent.id,
      description: "test created event description",
      stage1: {
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 19:00"),
        description: "",
        maps: [],
      },
      stage2: {
        start: new Date("2031-01-01 09:00"),
        end: new Date("2031-01-02 19:00"),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "",
        maps: [],
      },
    };

    const res1 = await loginAs(request(app).put(`/all-out/events`), testHeadAdmin).send(event1);
    const res2 = await loginAs(request(app).put(`/all-out/events`), testHeadAdmin).send(event2);

    assert.equal(res1.status, 400);
    assert.equal(res2.status, 400);
    assert.deepStrictEqual(res1.body, {
      errorCode: "ValidationError",
      errorMessage: "Stage 1 end time cannot be earlier than Stage 1 start time",
    });
    assert.deepStrictEqual(res2.body, {
      errorCode: "ValidationError",
      errorMessage: "Stage 2 start time cannot be earlier than Stage 1 start time",
    });
  });

  it("returns event not found error when event doesn't exist", async () => {
    const event = {
      id: 200_000,
      description: "test description",
      stage1: {
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 19:00"),
        description: "",
        maps: [],
      },
      stage2: {
        start: new Date("2031-01-02 17:00"),
        end: new Date("2031-01-02 19:00"),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put(`/all-out/events`), testHeadAdmin).send(event);

    console.log(res.text)
    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(event.id).message,
    });
  });

  it("returns divisions not found error when divisions don't exist", async () => {
    const originalEvent = await ctx.allOut.events.upsert({
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
    entities.push(originalEvent);
    const event = {
      id: originalEvent.id,
      description: "test description",
      stage1: {
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 19:00"),
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
        start: new Date("2031-01-02 17:00"),
        end: new Date("2031-01-02 19:00"),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).put("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "DivisionsNotFoundError",
      errorMessage: "Divisions with ids '200001', '200002' not found",
    });
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
