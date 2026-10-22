import "dotenv/config";
import { BaseEntity } from "@mikro-orm/core";
import { Server } from "node:http";
import supertest from "supertest";
import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { app } from "#/app";
import { authService } from "#/auth/auth.service";
import { ctx } from "#/db-context";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { User } from "#/db-entities/User";
import { EventNotFoundError, EventNotStartedError, RegistrationNotFoundError } from "#/errors";
import { getAppError } from "#/middlewares/error-handler.middleware";
import { monthliesService } from "#/monthlies/monthlies.service";
import { tempusService } from "#/tempus/tempus.service";
import { tomorrow, yesterday } from "#/test/test-dates";

import { testSoldierDivision, testUser1 } from "../test-entities";
import {
  createServerAsync,
  getSingleSseResponseAsync,
  setupApiTestSuiteAsync,
  teardownApiTestSuiteAsync,
} from "../util";

async function request({
  eventId,
  asUser,
  timeSeconds,
}: {
  eventId: number;
  asUser?: User | undefined;
  timeSeconds?: number | undefined;
}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (asUser) {
    headers["Authorization"] = "Bearer " + authService.getToken({ id: asUser.id });
  }

  return await getSingleSseResponseAsync(
    `http://localhost:4002/monthlies/events/${eventId}/submit-time`,
    {
      method: "POST",
      body: timeSeconds
        ? {
            timeSeconds,
          }
        : undefined,
      headers,
    },
  );
}

let server: Server;

const entities: BaseEntity[] = [];
describe("POST /monthlies/events/:eventId/submit-time", () => {
  beforeAll(async () => {
    server = await createServerAsync(4002);
    await setupApiTestSuiteAsync();
  });

  afterAll(async () => {
    await teardownApiTestSuiteAsync(entities);
    server.close();
  });

  it("verifies submission when tempus map record happened during event", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const map = await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });
    const participant = await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    const now = new Date();
    const completion = { prSeconds: 100, prTimestamp: now };
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue(completion);

    const res = await request({ eventId: event.id, asUser: testUser1 });

    assert.deepStrictEqual(res, monthliesService.submissionVerified);
    const leaderboardItem = await ctx.monthlies.leaderboard.findOne({ map });
    assert.isNotNull(leaderboardItem);
    assert.containSubset(leaderboardItem.serialize(), {
      participant: participant.id,
      verified: true,
      prSeconds: completion.prSeconds,
    });
  });

  it("accepts submission with time when tempus map record is faster than submitted time", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const map = await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });
    const participant = await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    const now = new Date();
    const completion = { prSeconds: 100, prTimestamp: now };
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue(completion);

    const res = await request({ eventId: event.id, asUser: testUser1, timeSeconds: 110 });

    assert.deepStrictEqual(res, monthliesService.submissionAccepted);
    const leaderboardItem = await ctx.monthlies.leaderboard.findOne({ map });
    assert.isNotNull(leaderboardItem);
    assert.containSubset(leaderboardItem.serialize(), {
      participant: participant.id,
      verified: false,
      prSeconds: 110,
    });
  });

  it("rejects submission when tempus map record doesn't exist", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const map = await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue(null);

    const res = await request({ eventId: event.id, asUser: testUser1 });

    assert.deepStrictEqual(res, monthliesService.recordNotFound);
    const leaderboardItem = await ctx.monthlies.leaderboard.findOne({ map });
    assert.notExists(leaderboardItem?.id);
  });

  it("rejects submisison when tempus map record happened before event", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const map = await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    const completion = { prSeconds: 100, prTimestamp: new Date(`${yesterday} 09:00`) };
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue(completion);

    const res = await request({ eventId: event.id, asUser: testUser1 });

    assert.deepStrictEqual(res, monthliesService.recordOlderThanEvent);
    const leaderboardItem = await ctx.monthlies.leaderboard.findOne({ map });
    assert.notExists(leaderboardItem?.id);
  });

  it("rejects submisison when tempus map record happened after event", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${yesterday} 16:00`),
    });
    entities.push(event);
    const map = await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    const completion = { prSeconds: 100, prTimestamp: new Date() };
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue(completion);

    const res = await request({ eventId: event.id, asUser: testUser1 });

    assert.deepStrictEqual(res, monthliesService.recordNewerThanEvent);
    const leaderboardItem = await ctx.monthlies.leaderboard.findOne({ map });
    assert.notExists(leaderboardItem?.id);
  });

  it("rejects submission with time when tempus map record is slower than submitted time", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);
    const map = await ctx.monthlies.maps.upsert({
      name: "soldier map",
      division: testSoldierDivision,
      event,
    });
    await ctx.monthlies.participants.upsert({
      user: testUser1,
      division: testSoldierDivision,
      event,
    });
    const completion = { prSeconds: 100, prTimestamp: new Date() };
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue(completion);

    const res = await request({ eventId: event.id, asUser: testUser1, timeSeconds: 99 });

    assert.deepStrictEqual(res, monthliesService.recordSlowerThanSubmission);
    const leaderboardItem = await ctx.monthlies.leaderboard.findOne({ map });
    assert.notExists(leaderboardItem?.id);
  });

  it("returns event not found error when event doesn't exist", async () => {
    const res = await request({ eventId: 200_000, asUser: testUser1 });

    assert.deepStrictEqual(res, getAppError(new EventNotFoundError(200_000)));
  });

  it("returns event not started error when event hasn't started yet", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${tomorrow} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);

    const res = await request({ eventId: event.id, asUser: testUser1 });

    assert.deepStrictEqual(res, getAppError(new EventNotStartedError(event.id, event.start)));
  });

  it("returns registration not found error when trying to submit time without registration", async () => {
    const event = await ctx.monthlies.events.upsert({
      type: MonthlyEventType.SOLDIER,
      description: "description",
      start: new Date(`${yesterday} 10:00`),
      end: new Date(`${tomorrow} 16:00`),
    });
    entities.push(event);

    const res = await request({ eventId: event.id, asUser: testUser1 });

    assert.deepStrictEqual(
      res,
      getAppError(new RegistrationNotFoundError({ user: testUser1, eventId: event.id })),
    );
  });

  it("returns unauthorized when user is not logged in", async () => {
    const res = await supertest(app).post(`/monthlies/events/200000/submit-time`);

    assert.equal(res.statusCode, 401);
  });
});
