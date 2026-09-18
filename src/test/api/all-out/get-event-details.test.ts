import { app } from "#/app";
import request from "supertest";
import { EventNotFoundError } from "#/errors";
import {
  testAllOutEvent,
  testAllOutStage1DemomanMap,
  testAllOutStage1SoldierMap,
  testAllOutStage2DemomanMap,
  testAllOutStage2SoldierMap,
  testAllOutStage3DemomanMap,
  testAllOutStage3SoldierMap,
} from "./all-out-test-entities";
import { testDemomanDivision, testSoldierDivision } from "../test-entities";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";

describe("GET /all-out/events/:eventId", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync();
  });

  it("returns event details", async () => {
    const res = await request(app).get("/all-out/events/" + testAllOutEvent.id);

    assert(res.ok);
    assert.deepStrictEqual(res.body, {
      id: testAllOutEvent.id,
      canceled: false,
      description: testAllOutEvent.description,
      stage1: {
        description: testAllOutEvent.stage1Description,
        start: testAllOutEvent.stage1Start.toISOString(),
        end: testAllOutEvent.stage1End.toISOString(),
        maps: {
          soldier: [
            {
              id: testAllOutStage1SoldierMap.id,
              name: testAllOutStage1SoldierMap.name,
              timeLimit: testAllOutStage1SoldierMap.timeLimit,
              division: {
                name: testSoldierDivision.name,
                color: testSoldierDivision.color,
                type: "soldier",
              },
            },
          ],
          demoman: [
            {
              id: testAllOutStage1DemomanMap.id,
              name: testAllOutStage1DemomanMap.name,
              timeLimit: testAllOutStage1DemomanMap.timeLimit,
              division: {
                name: testDemomanDivision.name,
                color: testDemomanDivision.color,
                type: "demoman",
              },
            },
          ],
        },
      },
      stage2: {
        description: testAllOutEvent.stage2Description,
        start: testAllOutEvent.stage2Start.toISOString(),
        end: testAllOutEvent.stage2End.toISOString(),
        maps: {
          soldier: [
            {
              id: testAllOutStage2SoldierMap.id,
              name: testAllOutStage2SoldierMap.name,
              division: {
                name: testSoldierDivision.name,
                color: testSoldierDivision.color,
                type: "soldier",
              },
            },
          ],
          demoman: [
            {
              id: testAllOutStage2DemomanMap.id,
              name: testAllOutStage2DemomanMap.name,
              division: {
                name: testDemomanDivision.name,
                color: testDemomanDivision.color,
                type: "demoman",
              },
            },
          ],
        },
      },
      stage3: {
        description: testAllOutEvent.stage3Description,
        start: testAllOutEvent.stage3Start.toISOString(),
        end: testAllOutEvent.stage3End.toISOString(),
        maps: {
          soldier: [
            {
              id: testAllOutStage3SoldierMap.id,
              name: testAllOutStage3SoldierMap.name,
              division: {
                name: testSoldierDivision.name,
                color: testSoldierDivision.color,
                type: "soldier",
              },
            },
          ],
          demoman: [
            {
              id: testAllOutStage3DemomanMap.id,
              name: testAllOutStage3DemomanMap.name,
              division: {
                name: testDemomanDivision.name,
                color: testDemomanDivision.color,
                type: "demoman",
              },
            },
          ],
        },
      },
    });
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await request(app).get("/all-out/events/" + 200_000);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });
});
