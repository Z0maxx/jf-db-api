import { ctx } from "#/db-context";
import request from "supertest";
import { app } from "#/app";
import { testAllOutEvent } from "./all-out-test-entities";
import { testUser1 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { EventNotFoundError } from "#/errors";
import { BaseEntity } from "@mikro-orm/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

const entities: BaseEntity[] = [];
describe("GET /all-out/events/:eventId/registration", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("returns if a user is registered to an event", async () => {
    const otherTestEvent = await ctx.allOut.events.upsert({
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
    entities.push(otherTestEvent);

    const res1 = await loginAs(
      request(app).get(`/all-out/events/${testAllOutEvent.id}/registration`),
      testUser1,
    );
    const res2 = await loginAs(
      request(app).get(`/all-out/events/${otherTestEvent.id}/registration`),
      testUser1,
    );

    assert(res1.ok);
    assert(res2.ok);
    assert.deepStrictEqual(res1.body, { isRegistered: true });
    assert.deepStrictEqual(res2.body, { isRegistered: false });
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(request(app).get("/all-out/events/200000/registration"), testUser1);

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, {
      errorCode: "EventNotFoundError",
      errorMessage: new EventNotFoundError(200_000).message,
    });
  });

  it("returns unauthorized when not logged in", async () => {
    const res = request(app).get(`/all-out/events/${testAllOutEvent.id}/registration`);

    assert.equal((await res).status, 401);
  });
});
