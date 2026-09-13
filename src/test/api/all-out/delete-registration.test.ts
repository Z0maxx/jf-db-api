import { app } from "@/app";
import request from "supertest";
import { it, describe, before, after } from "node:test";
import assert from "node:assert";
import { ctx } from "@/db-context";
import { initAllOutTestsAsync } from "./all-out-util";
import { BaseEntity } from "@mikro-orm/core";
import { testSoldierDivision, testUser1 } from "../test-entities";
import { deleteEntitiesAsync, loginAs } from "../util";
import { EventNotFoundError } from "@/errors";

const entities: BaseEntity[] = [];
describe("DELETE /all-out/events/:eventId/registration", () => {
  before(async () => {
    await initAllOutTestsAsync();
  });

  after(async () => {
    await deleteEntitiesAsync(entities);
    await ctx.orm.close(true);
  });

  it("deletes user's registration to event and participant divisions", async () => {
    const event = await ctx.allOut.events.upsert({
      id: 100_103,
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
    entities.push(
      await ctx.allOut.stage1Maps.upsert({
        id: 100_103,
        name: "stage 1 soldier map",
        timeLimit: 10,
        event,
        division: testSoldierDivision,
      }),
    );
    const participant = await ctx.allOut.participants.upsert({
      id: 100_103,
      user: testUser1,
      event,
    });
    await ctx.allOut.participantDivisions.upsert({
      id: 100_103,
      participant,
      division: testSoldierDivision,
    });

    const res = await loginAs(
      request(app).delete(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert(res.ok);
    const deletedParticipant = await ctx.allOut.participants.findOne({ user: testUser1, event });
    assert.equal(deletedParticipant, null);
    const deletedParticipantDivision = await ctx.allOut.participantDivisions.findOne({
      participant,
    });
    assert.equal(deletedParticipantDivision, null);
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(
      request(app).delete(`/all-out/events/200000/registration`),
      testUser1,
    );

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });
});
