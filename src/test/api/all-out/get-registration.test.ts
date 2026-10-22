import { BaseEntity } from "@mikro-orm/core";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { app } from "#/app";
import { ctx } from "#/db-context";
import { EventNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";

import { testUser1, testUser2 } from "../test-entities";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { testAllOutEvent } from "./all-out-test-entities";

function request(id: number) {
  return supertest(app).get(`/all-out/events/${id}/registration`);
}

const entities: BaseEntity[] = [];
describe("GET /all-out/events/:eventId/registration", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("returns registration details", async () => {
    const otherEvent = await ctx.allOut.events.upsert({
      description: "description",
      stage1Start: new Date("2030-01-01 10:00"),
      stage1End: new Date("2030-01-01 16:00"),
      stage2Start: new Date("2030-01-02 10:00"),
      stage2End: new Date("2030-01-02 16:00"),
      stage3Start: new Date("2030-01-03 10:00"),
      stage3End: new Date("2030-01-03 16:00"),
      stage1Description: "stage 1 description",
      stage2Description: "stage 2 description",
      stage3Description: "stage 3 description",
    });
    entities.push(otherEvent);
    await ctx.allOut.participants.upsert({
      user: testUser2,
      event: otherEvent,
      resigned: true,
    });

    const res1 = await loginAs(testUser1, request(testAllOutEvent.id));
    const res2 = await loginAs(testUser1, request(otherEvent.id));
    const res3 = await loginAs(testUser2, request(otherEvent.id));

    assert(res1.ok);
    assert(res2.ok);
    assert(res3.ok);
    assert.deepStrictEqual(res1.body, { registered: true, resigned: false });
    assert.deepStrictEqual(res2.body, { registered: false, resigned: false });
    assert.deepStrictEqual(res3.body, { registered: true, resigned: true });
  });

  it("returns not found error when event doesn't exist", async () => {
    const res = await loginAs(testUser1, request(200000));

    assert.equal(res.statusCode, 404);
    assert.deepStrictEqual(res.body, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns unauthorized when not logged in", async () => {
    const res = request(testAllOutEvent.id);

    assert.equal((await res).status, 401);
  });
});
