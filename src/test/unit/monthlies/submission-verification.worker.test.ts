import { beforeEach } from "node:test";
import { Worker } from "node:worker_threads";
import { assert, describe, it, vi } from "vitest";

import { MonthlyEventType } from "#/db-entities/MonthlyEvent";
import {
  clearCache,
  verifyLeaderboardSubmissionsAsync,
  workerFileName,
} from "#/monthlies/submission-verification.worker";
import { MonthlyLeaderboardSubmissionDto } from "#/monthlies/monthlies.types";
import { tempusService } from "#/tempus/tempus.service";
import { convertToSteam64Id } from "#/util";
/*

Tested map run:
{
  kind": "TF_Chat_All",
  "from": "",
  "text": "Tempus | (Solly) Alfduck map run 06:57.46 (PR -01:15.03) | 01:15.03 improvement",
  "tick": 454705
}

Map run got finished at 2026-10-23 14:41:19.575 based on demo start and tick

User:
"34": {
  "classes": {
    "0": 1,
    "3": 2,
    "4": 1
  },
  "name": "Alfduck",
  "userId": 34,
  "steamId": "[U:1:839595073]",
  "team": "blue"
}
*/

describe("verifies leaderboard submissions", () => {
  beforeEach(() => {
    clearCache();
  });

  it("verifies existing valid submission", async () => {
    vi.spyOn(tempusService, "getServerDemosAsync").mockResolvedValue([
      {
        start: new Date("2026-10-23 12:47:39"),
        mapName: "jump_mourn_a3",
        url: "https://github.com/Z0maxx/jf-db-api/raw/refs/heads/main/src/test/assets/auto-20261023-124739-jump_mourn_a3.zip",
        fileName: "auto-20261023-124739-jump_mourn_a3.dem",
      },
    ]);
    const submission = {
      id: 1,
      mapId: 1,
      leaderboardItemId: 1,
      submissionTimestamp: new Date("2026-10-23 14:43:00"),
      seconds: 417.46,
      tempusServerId: 1,
      mapName: "jump_mourn_a3",
      steam64Id: convertToSteam64Id("[U:1:839595073]")!,
      event: {
        type: MonthlyEventType.SOLDIER,
        end: new Date("2026-10-23 16:00:00"),
      },
    };

    const res = await verifyLeaderboardSubmissionsAsync([submission]);

    assert.isEmpty(res.rejectedSubmissions);
    assert.lengthOf(res.verifiedSubmissions, 1);
    assert.containsSubset(res.verifiedSubmissions[0], submission);
    assert.exists(res.verifiedSubmissions[0].prTimestamp);
  }, 100_000);

  it("doesn't reject or verify submission when there is a demo still recording that started before submission's timestamp", async () => {
    vi.spyOn(tempusService, "getServerDemosAsync").mockResolvedValue([
      {
        start: new Date("2026-10-23 12:47:39"),
        mapName: "jump_mourn_a3",
        url: null,
        fileName: "auto-20261023-124739-jump_mourn_a3.dem",
      },
    ]);
    const submission = {
      id: 1,
      mapId: 1,
      leaderboardItemId: 1,
      submissionTimestamp: new Date("2026-10-23 14:43:00"),
      seconds: 417.46,
      tempusServerId: 1,
      mapName: "jump_mourn_a3",
      steam64Id: convertToSteam64Id("[U:1:839595073]")!,
      event: {
        type: MonthlyEventType.SOLDIER,
        end: new Date("2026-10-23 16:00:00"),
      },
    };

    const res = await verifyLeaderboardSubmissionsAsync([submission]);

    assert.isEmpty(res.rejectedSubmissions);
    assert.isEmpty(res.verifiedSubmissions);
  }, 100_000);

  it("rejects submission when map run happened after event's end time", async () => {
    vi.spyOn(tempusService, "getServerDemosAsync").mockResolvedValue([
      {
        start: new Date("2026-10-23 12:47:39"),
        mapName: "jump_mourn_a3",
        url: "https://github.com/Z0maxx/jf-db-api/raw/refs/heads/main/src/test/assets/auto-20261023-124739-jump_mourn_a3.zip",
        fileName: "auto-20261023-124739-jump_mourn_a3.dem",
      },
    ]);
    const submission = {
      id: 1,
      mapId: 1,
      leaderboardItemId: 1,
      submissionTimestamp: new Date("2026-10-23 14:43:00"),
      seconds: 417.46,
      tempusServerId: 1,
      mapName: "jump_mourn_a3",
      steam64Id: convertToSteam64Id("[U:1:839595073]")!,
      event: {
        type: MonthlyEventType.SOLDIER,
        end: new Date("2026-10-23 14:40:00"),
      },
    };

    const res = await verifyLeaderboardSubmissionsAsync([submission]);

    assert.isEmpty(res.verifiedSubmissions);
    assert.lengthOf(res.rejectedSubmissions, 1);
    assert.containsSubset(res.rejectedSubmissions[0], submission);
  });

  it("rejects submission when map run doesn't exist and still recording demo's start time is after submission's timestamp", async () => {
    vi.spyOn(tempusService, "getServerDemosAsync").mockResolvedValue([
      {
        start: new Date("2026-10-23 14:44:00"),
        mapName: "jump_mourn_a3",
        url: null,
        fileName: "auto-20261023-124400-jump_mourn_a3.dem",
      },
    ]);
    const submission = {
      id: 1,
      mapId: 1,
      leaderboardItemId: 1,
      submissionTimestamp: new Date("2026-10-23 14:43:00"),
      seconds: 417.46,
      tempusServerId: 1,
      mapName: "jump_mourn_a3",
      steam64Id: convertToSteam64Id("[U:1:839595073]")!,
      event: {
        type: MonthlyEventType.SOLDIER,
        end: new Date("2026-10-23 16:00:00"),
      },
    };

    const res = await verifyLeaderboardSubmissionsAsync([submission]);

    assert.isEmpty(res.verifiedSubmissions);
    assert.lengthOf(res.rejectedSubmissions, 1);
    assert.containsSubset(res.rejectedSubmissions[0], submission);
  }, 100_000);

  it("works as a worker", async () => {
    const worker = new Worker(workerFileName, {
      execArgv: ["--import", "tsx"],
    });

    worker.postMessage({ type: "submissions", submissions: [] });
    const res = await new Promise<MonthlyLeaderboardSubmissionDto[]>((res) => {
      worker.on("message", (result: MonthlyLeaderboardSubmissionDto[]) => {
        res(result);
      });
    });

    assert.exists(res);
  });
});
