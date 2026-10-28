import "dotenv/config";
import { MikroORM, NodeSqliteDialect, SqliteDriver } from "@mikro-orm/sql";
import path from "node:path";
import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { ctx } from "#/db-context";
import { DivisionType } from "#/db-entities/Division";
import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import { UserTempusIdStatus } from "#/db-entities/User";
import { seedEntitiesAsync, userRole } from "#/default-entities";
import { envConfig } from "#/env-config";
import { MonthlyLeaderboardVerificationWorkerResult } from "#/monthlies/monthlies.types";
import { submissionVerificationWorkerFileName } from "#/monthlies/submission-verification.worker";
import { steamService } from "#/steam/steam.service";
import { SteamUser } from "#/steam/steam.types";
import { tempusService } from "#/tempus/tempus.service";
import { tomorrow, yesterday } from "#/test/test-dates";
import { mockWorkers } from "#/test/util";

const mockedWorkers = mockWorkers([submissionVerificationWorkerFileName]);
const verificationWorkerMock = mockedWorkers[submissionVerificationWorkerFileName];
const rootDir = __dirname.split("src")[0];

let monthliesService!: Awaited<ReturnType<typeof getMonthliesServiceAsync>>;

async function getMonthliesServiceAsync() {
  const module = await import("#/monthlies/monthlies.service.js");
  return module.monthliesService;
}

async function setupTestEntitesAsync() {
  const testSoldierDivision = await ctx.divisions.upsert({
    name: "soldier division",
    color: "000000",
    type: DivisionType.SOLDIER,
  });

  const [user1, user2] = await ctx.users.upsertMany([
    {
      id: 100_001,
      steam64Id: "76561198167723343",
      tempusId: 47849,
      tempusIdStatus: UserTempusIdStatus.VERIFIED,
      role: userRole,
    },
    {
      id: 100_002,
      steam64Id: "76561198046214898",
      tempusId: 94512,
      tempusIdStatus: UserTempusIdStatus.VERIFIED,
      role: userRole,
    },
  ]);

  user1.divisionCollection.set([testSoldierDivision]);
  user2.divisionCollection.set([testSoldierDivision]);

  await ctx.saveAsync();
  const [testUser1, testUser2] = await ctx.users.find(
    { id: { $in: [user1.id, user2.id] } },
    { populate: ["divisionCollection", "role.claimCollection"] },
  );

  const testEvent = await ctx.monthlies.events.upsert({
    type: MonthlyEventType.SOLDIER,
    description: "description",
    start: new Date(`${yesterday} 10:00`),
    end: new Date(`${tomorrow} 16:00`),
  });

  const testMap = await ctx.monthlies.maps.upsert({
    name: "soldier map",
    division: testSoldierDivision,
    event: testEvent,
  });

  const [testParticipant1, testParticipant2] = await ctx.monthlies.participants.upsertMany([
    {
      user: testUser1,
      division: testSoldierDivision,
      event: testEvent,
    },
    {
      user: testUser2,
      division: testSoldierDivision,
      event: testEvent,
    },
  ]);

  return {
    testEvent,
    testMap,
    testUser1,
    testUser2,
    testParticipant1,
    testParticipant2,
  };
}

describe("monthlies service communication with verification worker", async () => {
  beforeAll(async () => {
    ctx.orm = await MikroORM.init({
      driver: SqliteDriver,
      driverOptions: new NodeSqliteDialect(":memory:"),
      dbName: ":memory:",
      entities: [path.join(rootDir, "dist", "db-entities", "*.js")],
      entitiesTs: [path.join(rootDir, "src", "db-entities", "*.ts")],
    });

    for (const meta of ctx.orm.getMetadata().getAll().values()) {
      meta.checks = [];
    }

    await ctx.orm.schema.refresh();
    await seedEntitiesAsync();
    monthliesService = await getMonthliesServiceAsync();
  });

  afterAll(() => {
    ctx.orm.close(true);
  });

  it("calls verification worker to process leaderboard submissions after defined time", async () => {
    const { testEvent, testUser1 } = await setupTestEntitesAsync();
    vi.spyOn(tempusService, "getServersAsync").mockResolvedValue([
      { name: "tempus server", id: 62 },
    ]);
    vi.spyOn(tempusService, "getCompletionAsync").mockResolvedValue({
      prSeconds: 100,
      prTimestamp: new Date(`${yesterday} 09:00`),
    });
    vi.spyOn(steamService, "getUsersAsync").mockResolvedValue(
      new Map<string, SteamUser>([
        [testUser1.steam64Id, { steam64Id: testUser1.steam64Id, name: "user name", avatar: "" }],
      ]),
    );
    vi.useFakeTimers();
    let workerResolve = (_: unknown) => {};
    const workerPromise = new Promise((res) => {
      workerResolve = res;
    });
    verificationWorkerMock.postMessage.mockImplementation(() => workerResolve(null));

    monthliesService.submitTimeAsync(testUser1, {
      eventId: testEvent.id,
      details: {
        timeSeconds: 300,
        tempusServerId: 62,
      },
    });
    await vi.advanceTimersByTimeAsync(envConfig.MONTHLY_VERIFICATION_LOOP_MINUTES * 60 * 1000);
    vi.useRealTimers();
    await workerPromise;

    assert.lengthOf(verificationWorkerMock.postMessage.mock.calls, 1);
    assert.lengthOf(verificationWorkerMock.postMessage.mock.calls[0], 1);
    const lastCallParam = verificationWorkerMock.postMessage.mock.lastCall![0];
    assert.equal(lastCallParam.type, "submissions");
  });

  it("handles verification worker results", async () => {
    const { testEvent, testMap, testUser1, testUser2, testParticipant1, testParticipant2 } =
      await setupTestEntitesAsync();
    const [leaderboardItemToDelete, leaderboardItemToVerify] =
      await ctx.monthlies.leaderboard.upsertMany([
        {
          prSeconds: 111,
          prTimestamp: new Date("2030-01-01 11:11"),
          participant: testParticipant1,
          map: testMap,
          verified: false,
        },
        {
          prSeconds: 222,
          prTimestamp: new Date("2030-01-01 22:22"),
          participant: testParticipant2,
          map: testMap,
          verified: false,
        },
      ]);
    const [submission1, submission2] = await ctx.monthlies.leaderboardSubmissions.upsertMany([
      {
        submissionTimestamp: new Date("2030-01-01 11:11"),
        tempusServerId: 62,
        leaderboardItem: leaderboardItemToDelete,
        event: testEvent,
      },
      {
        submissionTimestamp: new Date("2030-01-01 22:22"),
        tempusServerId: 62,
        leaderboardItem: leaderboardItemToVerify,
        event: testEvent,
      },
    ]);
    const submissionResults: MonthlyLeaderboardVerificationWorkerResult = {
      rejectedSubmissions: [
        {
          id: submission1.id,
          mapId: testMap.id,
          leaderboardItemId: leaderboardItemToDelete.id,
          submissionTimestamp: submission1.submissionTimestamp,
          seconds: leaderboardItemToDelete.prSeconds,
          tempusServerId: submission1.tempusServerId,
          mapName: testMap.name,
          steam64Id: testUser1.steam64Id,
          event: {
            type: testEvent.type,
            end: testEvent.end,
          },
        },
      ],
      verifiedSubmissions: [
        {
          id: submission2.id,
          mapId: testMap.id,
          leaderboardItemId: leaderboardItemToVerify.id,
          submissionTimestamp: submission2.submissionTimestamp,
          seconds: leaderboardItemToVerify.prSeconds,
          tempusServerId: submission2.tempusServerId,
          mapName: testMap.name,
          steam64Id: testUser2.steam64Id,
          event: {
            type: testEvent.type,
            end: testEvent.end,
          },
          prTimestamp: new Date("2030-01-01 22:21"),
        },
      ],
    };

    let leaderboardResolve = (_: unknown) => {};
    const leaderboardPromise = new Promise(async (res) => {
      leaderboardResolve = res;
    });
    let itemsCount = 0;
    await monthliesService.subscribeToLeaderboardAsync(testMap.id, (items) => {
      itemsCount++;
      if (itemsCount === 2) {
        leaderboardResolve(items);
      }
    });

    verificationWorkerMock.listeners.forEach((l) => l(submissionResults));
    await leaderboardPromise;

    const deletedLeaderboardItem = await ctx.monthlies.leaderboard.findOne({
      id: leaderboardItemToDelete.id,
    });
    assert.notExists(deletedLeaderboardItem?.id);
    assert.isTrue(leaderboardItemToVerify.verified);
    const submissions = await ctx.monthlies.leaderboardSubmissions.find({
      id: { $in: [submission1.id, submission2.id] },
    });
    assert.isEmpty(submissions);
  });
});
