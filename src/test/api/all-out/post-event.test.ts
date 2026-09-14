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
        start: new Date("2031-01-01 17:00"),
        end: new Date("2031-01-01 19:00"),
        description: "test created stage 1 description",
        maps: [
          {
            name: "test created stage 1 soldier map",
            divisionId: testSoldierDivision.id,
            timeLimit: 21,
          },
          {
            name: "test created stage 1 demoman map",
            divisionId: testDemomanDivision.id,
            timeLimit: 22,
          },
        ],
      },
      stage2: {
        start: new Date("2031-01-02 17:00"),
        end: new Date("2031-01-02 19:00"),
        description: "test created stage 2 description",
        maps: [
          {
            name: "test created stage 2 soldier map",
            divisionId: testSoldierDivision.id,
          },
          {
            name: "test created stage 2 demoman map",
            divisionId: testDemomanDivision.id,
          },
        ],
      },
      stage3: {
        start: new Date("2031-01-03 17:00"),
        end: new Date("2031-01-03 19:00"),
        description: "test created stage 3 description",
        maps: [
          {
            name: "test created stage 3 soldier map",
            divisionId: testSoldierDivision.id,
          },
          {
            name: "test created stage 3 demoman map",
            divisionId: testDemomanDivision.id,
          },
        ],
      },
    };

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);

    assert(res.ok);
    const createdEvent = await ctx.allOut.events.findOne({ id: res.body.id });
    assert.notEqual(createdEvent, null);
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

    console.log(res.text);
    assert.equal(res.status, 400);
  });

  it("returns validation error when stage times are out of order", async () => {
    const event1 = {
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

    const res1 = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event1);
    const res2 = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event2);

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

  it("returns divisions not found error when divisions don't exist", async () => {
    const event = {
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

    const res = await loginAs(request(app).post("/all-out/events"), testHeadAdmin).send(event);

    assert.equal(res.status, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "DivisionsNotFoundError",
      errorMessage: "Divisions with ids '200001', '200002' not found",
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
