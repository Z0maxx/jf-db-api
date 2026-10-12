import { BaseEntity } from "@mikro-orm/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { loginAs, setupApiTestSuiteAsync, teardownApiTestSuiteAsync } from "../util";
import { ctx } from "#/db-context";
import { testHeadAdmin, testUser1 } from "../test-entities";
import supertest from "supertest"
import { app } from "#/app";
import { ParticipantNotFoundError } from "#/errors";

function request(id: number) {
  return supertest(app).post(`/lan/participants/${id}/disqualify`)
}

const entities: BaseEntity[] = [];
describe("POST /lan/participants/:participantId/disqualify", () => {
  beforeAll(async () => {
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
  });

  it("disqualifies participant", async () => {
    const event = await ctx.lan.events.upsert({
      name: "lan event",
      start: new Date(`2030-01-01 10:00`),
      description: "description",
    });
    entities.push(event);
    const participant = await ctx.lan.participants.upsert({
      user: testUser1,
      event,
      alias: ""
    })

    const res = await loginAs(testHeadAdmin, request(participant.id))

    assert(res.ok)
    assert(participant.disqualified)
  })

  it("returns not found error when participant doesn't exist", async () => {
    const res = await loginAs(testHeadAdmin, request(200_000))

    assert.equal(res.status, 404)
    assert.deepStrictEqual(res.body, {
      errorCode: "ParticipantNotFoundError",
      errorMessage: new ParticipantNotFoundError(200_000).message
    })
  })

  it("returns unauthorized when user is not logged in", async() => {
    const res = await request(200_000)

    assert.equal(res.status, 401)
  })

  it("returns forbidden when user can't manage events", async () => {
    const res = await loginAs(testUser1, request(200_000))

    assert.equal(res.status, 403)
  })
})

