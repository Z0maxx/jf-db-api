import { ctx } from "#/db-context";
import { BaseEntity } from "@mikro-orm/core";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import request from "supertest";
import { app } from "#/app";
import {
  testDemomanDivision,
  testHeadAdmin,
  testSoldierDivision,
  testUser1,
} from "../test-entities";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { DivisionsNotFoundError } from "#/errors";
import { tomorrow, yesterday } from "#/test/test-dates";
import { allOutScheduleValidator } from "#/all-out/validators/all-out-schedule.validator";
import { allOutDuplicateMapValidator } from "#/all-out/validators/all-out-duplicate-map.validator";
import { allOutCreatedDatesValidator } from "#/all-out/validators/all-out-created-dates.validator";

const entities: BaseEntity[] = [];
describe("POST /all-out/events", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("creates event with maps", async () => {
    const event = {
      description: "test created event description",
      stage1: {
        start: new Date(`${tomorrow} 10:00`),
        end: new Date(`${tomorrow} 11:00`),
        description: "test created stage 1 description",
        maps: [
          {
            name: "stage 1 map",
            divisionId: testSoldierDivision.id,
            timeLimit: 21,
          },
          {
            name: "stage 1 map",
            divisionId: testDemomanDivision.id,
            timeLimit: 22,
          },
        ],
      },
      stage2: {
        start: new Date(`${tomorrow} 12:00`),
        end: new Date(`${tomorrow} 13:00`),
        description: "test created stage 2 description",
        maps: [
          {
            name: "stage 2 map",
            divisionId: testSoldierDivision.id,
          },
          {
            name: "stage 2 map",
            divisionId: testDemomanDivision.id,
          },
        ],
      },
      stage3: {
        start: new Date(`${tomorrow} 14:00`),
        end: new Date(`${tomorrow} 15:00`),
        description: "test created stage 3 description",
        maps: [
          {
            name: "stage 3 map",
            divisionId: testSoldierDivision.id,
          },
          {
            name: "stage 3 map",
            divisionId: testDemomanDivision.id,
          },
        ],
      },
    };

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);

    assert(res.ok);
    const createdEvent = await ctx.allOut.events.findOne({ id: res.body.id });
    assert.isNotNull(createdEvent);
    assert.containSubset(createdEvent!.serialize(), {
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
    entities.push(createdEvent!);
    const createdStage1Maps = await ctx.allOut.stage1Maps.find({ event: createdEvent });
    assert.equal(createdStage1Maps.length, 2);
    assert.containSubset(
      createdStage1Maps.map((m) => m.serialize()),
      [
        {
          name: event.stage1.maps[0].name,
          timeLimit: event.stage1.maps[0].timeLimit,
          division: testSoldierDivision.id,
        },
        {
          name: event.stage1.maps[1].name,
          timeLimit: event.stage1.maps[1].timeLimit,
          division: testDemomanDivision.id,
        },
      ],
    );
    const createdStage2Maps = await ctx.allOut.stage2Maps.find({ event: createdEvent });
    assert.equal(createdStage2Maps.length, 2);
    assert.containSubset(
      createdStage2Maps.map((m) => m.serialize()),
      [
        {
          name: event.stage2.maps[0].name,
          division: testSoldierDivision.id,
        },
        {
          name: event.stage2.maps[1].name,
          division: testDemomanDivision.id,
        },
      ],
    );
    const createdStage3Maps = await ctx.allOut.stage3Maps.find({ event: createdEvent });
    assert.equal(createdStage3Maps.length, 2);
    assert.containSubset(
      createdStage3Maps.map((m) => m.serialize()),
      [
        {
          name: event.stage3.maps[0].name,
          division: testSoldierDivision.id,
        },
        {
          name: event.stage3.maps[1].name,
          division: testDemomanDivision.id,
        },
      ],
    );
  });

  it("returns bad request when body is incorrect", async () => {
    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send({});

    assert.equal(res.status, 400);
  });

  it("returns validation error when stage times are out of order", async () => {
    const event = {
      description: "test description",
      stage1: {
        start: new Date(`${tomorrow} 16:00`),
        end: new Date(`${tomorrow} 15:00`),
        maps: [],
      },
      stage2: {
        start: new Date(`${tomorrow} 14:00`),
        end: new Date(`${tomorrow} 19:00`),
        maps: [],
      },
      stage3: {
        start: new Date(`${tomorrow} 20:00`),
        end: new Date(`${tomorrow} 21:00`),
        maps: [],
      },
    };

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);
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

  it("returns validation error when there are duplicate maps with same division in a stage", async () => {
    const event = {
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

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);

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

  it("returns validation error when stage times are in the past", async () => {
    const event = {
      description: "test description",
      stage1: {
        start: new Date(`${yesterday} 10:00`),
        end: new Date(`${yesterday} 11:00`),
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

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, {
      errorCode: "ValidationError",
      errorMessages: allOutCreatedDatesValidator.getMessages([
        { stage: 1, invalidDateFields: ["start", "end"] },
        { stage: 2, invalidDateFields: ["start", "end"] },
        { stage: 3, invalidDateFields: ["start", "end"] },
      ]),
    });
  });

  it("returns divisions not found error when divisions don't exist", async () => {
    const event = {
      description: "test description",
      stage1: {
        start: new Date(`${tomorrow} 10:00`),
        end: new Date(`${tomorrow} 11:00`),
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
        start: new Date(`${tomorrow} 12:00`),
        end: new Date(`${tomorrow} 13:00`),
        description: "",
        maps: [],
      },
      stage3: {
        start: new Date(`${tomorrow} 14:00`),
        end: new Date(`${tomorrow} 15:00`),
        description: "",
        maps: [],
      },
    };

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "DivisionsNotFoundError",
      errorMessage: new DivisionsNotFoundError([200_001, 200_002]).message,
    });
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await request(app).post("/all-out/events");

    assert.equal(res.status, 401);
  });

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(request(app).post("/all-out/events"), testUser1);

    assert.equal(res.status, 403);
  });
});
