import { after, before, describe, it } from "node:test";
import { initAllOutTestsAsync } from "./all-out-util";
import { ctx } from "@/db-context";
import { deleteEntitiesAsync, loginAs } from "../util";
import { app } from "@/app";
import request from "supertest";
import { testDemomanDivision, testSoldierDivision, testUser1 } from "../test-entities";
import assert from "node:assert";
import { BaseEntity } from "@mikro-orm/core";
import { CannotRegisterError, EventNotFoundError } from "@/errors";

const entities: BaseEntity[] = [];
describe("POST /all-out/events/:eventId/registration", () => {
  before(async () => {
    await initAllOutTestsAsync();
  });

  after(async () => {
    await deleteEntitiesAsync(entities);
    await ctx.orm.close(true);
  });

  it("registers user to event", async () => {
    const event = await ctx.allOut.events.upsert({
      id: 100_101,
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
        id: 100_101,
        name: "stage 1 soldier map",
        timeLimit: 10,
        event,
        division: testSoldierDivision,
      }),
    );

    const res = await loginAs(
      request(app).post(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert(res.ok);
    const participant = await ctx.allOut.participants.findOne({ user: testUser1.id, event });
    entities.push(participant!);
    assert.notEqual(participant, null);
    const participantDivisions = await ctx.allOut.participantDivisions.find({ participant });
    assert.deepStrictEqual(
      participantDivisions.map((pd) => pd.division.id),
      [testSoldierDivision.id, testDemomanDivision.id],
    );
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(request(app).post(`/all-out/events/200000/registration`), testUser1);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns unauthorized when not logged in", async () => {
    const res = request(app).post(`/all-out/events/200000/registration`);

    assert.equal((await res).status, 401);
  });

  it("returns forbidden when there are no maps with user's divisions", async () => {
    await ctx.allOut.events.nativeDelete({ id: 100_102 });
    const event = await ctx.allOut.events.upsert({
      id: 100_102,
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

    const res = await loginAs(
      request(app).post(`/all-out/events/${event.id}/registration`),
      testUser1,
    );

    assert.equal(res.status, 403);
    assert.deepStrictEqual(res.body, {
      errorCode: "CannotRegisterError",
      errorMessage: new CannotRegisterError({ userId: testUser1.id, eventId: event.id }).message,
    });
  });
});
