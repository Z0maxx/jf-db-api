import { app } from "@/app";
import request from "supertest";
import { ctx } from "@/db-context";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { EventNotFoundError } from "@/errors";
import { testDemomanDivision, testSoldierDivision, testUser1, testUser2 } from "../test-entities";
import {
  testAllOutEvent,
  testAllOutParticipant1,
  testAllOutParticipant2,
} from "./test-all-out-entities";
import { initAllOutTestsAsync } from "./all-out-util";

describe("GET /all-out/event/:eventId/participants", () => {
  before(async () => {
    await initAllOutTestsAsync();
  });

  after(async () => {
    await ctx.orm.close(true);
  });

  it("returns event participants", async () => {
    const res = await request(app).get(`/all-out/events/${testAllOutEvent.id}/participants`);

    assert(res.ok);
    assert.notEqual(res.body, null);
    assert.equal(res.body.length, 2);
    assert.partialDeepStrictEqual(res.body, [
      {
        id: testAllOutParticipant1.id,
        steamId64: testUser1.steamId64,
        divisions: [
          {
            type: testSoldierDivision.type,
            color: testSoldierDivision.color,
            name: testSoldierDivision.name,
          },
          {
            type: testDemomanDivision.type,
            color: testDemomanDivision.color,
            name: testDemomanDivision.name,
          },
        ],
      },
      {
        id: testAllOutParticipant2.id,
        steamId64: testUser2.steamId64,
        divisions: [
          {
            type: testSoldierDivision.type,
            color: testSoldierDivision.color,
            name: testSoldierDivision.name,
          },
          {
            type: testDemomanDivision.type,
            color: testDemomanDivision.color,
            name: testDemomanDivision.name,
          },
        ],
      },
    ]);
    assert.partialDeepStrictEqual(Object.keys(res.body[0]), ["name", "avatar"]);
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await request(app).get(`/all-out/events/200000/participants`);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });
});
