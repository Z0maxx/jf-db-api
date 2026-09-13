import { ctx } from "@/db-context";
import { after, before, describe, it } from "node:test";
import { initAllOutTestsAsync } from "./all-out-util";
import { BaseEntity } from "@mikro-orm/core";
import { deleteEntitiesAsync, loginAs } from "../util";
import request from "supertest";
import { app } from "@/app";
import { testDemomanDivision, testHeadAdmin, testSoldierDivision } from "../test-entities";
import assert from "node:assert";

const entities: BaseEntity[] = [];
describe("POST /all-out/events", () => {
  before(async () => {
    await initAllOutTestsAsync();
  });

  after(async () => {
    await deleteEntitiesAsync(entities);
    await ctx.orm.close(true);
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
            timeLimit: 20,
          },
          {
            name: "test created stage 1 demoman map",
            divisionId: testDemomanDivision.id,
            timeLimit: 21,
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
    assert.notEqual(createdEvent, null)
    assert.partialDeepStrictEqual(createdEvent!.serialize(), {
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
    })
    entities.push(createdEvent!);
    const createdStage1Maps = await ctx.allOut.stage1Maps.find({ event: createdEvent })
    assert.equal(createdStage1Maps.length, 2)
    assert.partialDeepStrictEqual(createdStage1Maps.map(m => m.serialize()), [
      {
        name: event.stage1.maps[0].name,
        timeLimit: event.stage1.maps[0].timeLimit,
        division: testSoldierDivision.id
      },
      {
        name: event.stage1.maps[1].name,
        timeLimit: event.stage1.maps[1].timeLimit,
        division: testDemomanDivision.id
      }
    ])
    const createdStage2Maps = await ctx.allOut.stage2Maps.find({ event: createdEvent })
    assert.equal(createdStage2Maps.length, 2)
    assert.partialDeepStrictEqual(createdStage2Maps.map(m => m.serialize()), [
      {
        name: event.stage2.maps[0].name,
        division: testSoldierDivision.id
      },
      {
        name: event.stage2.maps[1].name,
        division: testDemomanDivision.id
      }
    ])
    const createdStage3Maps = await ctx.allOut.stage3Maps.find({ event: createdEvent })
    assert.equal(createdStage3Maps.length, 2)
    assert.partialDeepStrictEqual(createdStage3Maps.map(m => m.serialize()), [
      {
        name: event.stage3.maps[0].name,
        division: testSoldierDivision.id
      },
      {
        name: event.stage3.maps[1].name,
        division: testDemomanDivision.id
      }
    ])
  });
});
