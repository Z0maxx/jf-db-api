import { parentPort } from "node:worker_threads";
import { unzip } from "unzipit";

import { MonthlyEventType, TMonthlyEventType } from "#/db-entities/MonthlyEvent";
import init, { parseDemo } from "#/demostf/tf_demo_parser.js";
import { tempusService } from "#/tempus/tempus.service";
import { TempusDemo } from "#/tempus/tempus.types";
import { DemoChatMessage, DemoContent } from "#/types";
import { convertToSteam64Id } from "#/util";

import {
  MonthlyLeaderboardSubmissionDto,
  MonthlyLeaderboardVerificationWorkerMessage,
} from "./monthlies.types";

export const workerFileName = __filename;

type DemoDetails = {
  fileName: string;
  msPerTick: number;
  start: Date;
  users: Map<string, string>;
  mapRunMessages: (DemoChatMessage & {
    tempusClass: string;
    userName: string;
    time: string;
  })[];
};

type MapRun = {
  type: TMonthlyEventType;
  steam64Id: string;
  seconds: number;
  timestamp: Date;
};

export const mapDemoDetailsCache = new Map<string, DemoDetails[]>();
const mapRunMessageRegExp = new RegExp(
  /^Tempus \| \((Solly|Demo)\) (.{1,}) map run ([\d:.]{1,}) (?:\((?:PR|WR) [\d+-:.]{1,}\))(?: \| [\d:.]{1,} improvement)?$/,
);

const tempusClassToType: Record<string, TMonthlyEventType> = {
  Solly: MonthlyEventType.SOLDIER,
  Demo: MonthlyEventType.DEMOMAN,
};

let initialized = false;

parentPort?.on("message", async (message: MonthlyLeaderboardVerificationWorkerMessage) => {
  if (message.type === "submissions") {
    parentPort?.postMessage(await verifyLeaderboardSubmissionsAsync(message.submissions!));
  } else if (message.type === "cleanup") {
    clearCache();
  }
});

export function clearCache() {
  mapDemoDetailsCache.clear();
}

export async function verifyLeaderboardSubmissionsAsync(
  submissions: MonthlyLeaderboardSubmissionDto[],
) {
  if (!initialized) {
    await init();
    initialized = true;
  }

  const submissionsByServerId = Object.groupBy(submissions, (i) => i.tempusServerId);
  const rejectedSubmissions: MonthlyLeaderboardSubmissionDto[] = [];
  const verifiedSubmissions: MonthlyLeaderboardSubmissionDto[] = [];
  await Promise.all(
    Object.entries(submissionsByServerId).map(async ([serverId, byServerId]) => {
      const demos = await tempusService.getServerDemosAsync(parseInt(serverId));
      const submissionsByMapName = Object.groupBy(byServerId!, (i) => i.mapName);
      await Promise.all(
        Object.entries(submissionsByMapName).map(async ([mapName, byMapName]) => {
          const mapDemos = demos.filter((d) => d.mapName === mapName);
          await processMapSubmissionsAsync(
            mapName,
            byMapName!,
            mapDemos,
            rejectedSubmissions,
            verifiedSubmissions,
          );
        }),
      );
    }),
  );

  return {
    rejectedSubmissions,
    verifiedSubmissions,
  };
}

async function processMapSubmissionsAsync(
  mapName: string,
  mapSubmissions: MonthlyLeaderboardSubmissionDto[],
  mapDemos: TempusDemo[],
  rejectedSubmissions: MonthlyLeaderboardSubmissionDto[],
  verifiedSubmissions: MonthlyLeaderboardSubmissionDto[],
) {
  const demoDetails = await getMapDemoDetailsAsync(mapName, mapSubmissions, mapDemos);
  const runs = getMapRunsFromDemoDetails(demoDetails);
  const runsBySteam64Id = new Map<string, MapRun[]>(
    Object.entries(Object.groupBy(runs, (r) => r.steam64Id)).map(([steam64Id, mapRuns]) => [
      steam64Id,
      mapRuns!,
    ]),
  );

  mapSubmissions.forEach((s) => {
    const runsByUser = runsBySteam64Id.get(s.steam64Id);
    const submittedRun = runsByUser?.find(
      (r) => r.type === s.event.type && r.timestamp < s.event.end && r.seconds === s.seconds,
    );

    if (submittedRun) {
      s.prTimestamp = submittedRun.timestamp;
      verifiedSubmissions.push(s);
      return;
    }

    const hasRecordingDemo = mapDemos.some((d) => !d.url && d.start < s.submissionTimestamp);
    if (!hasRecordingDemo) {
      rejectedSubmissions.push(s);
    }
  });
}

async function getMapDemoDetailsAsync(
  mapName: string,
  mapSubmissions: MonthlyLeaderboardSubmissionDto[],
  mapDemos: TempusDemo[],
): Promise<DemoDetails[]> {
  const sortedTimestamps = mapSubmissions
    .map((i) => i.submissionTimestamp)
    .sort((a, b) => a.getTime() - b.getTime());

  const newestTimestamp = sortedTimestamps[0];
  let i = 0;
  while (i < mapDemos.length && newestTimestamp < mapDemos[i].start) {
    i++;
  }

  const cachedDemoDetails = mapDemoDetailsCache.get(mapName) ?? [];
  const cachedFileNames = new Set(cachedDemoDetails.map((d) => d.fileName));
  const demosToDownload = mapDemos
    .slice(i)
    .filter((d) => !cachedFileNames.has(d.fileName) && d.url);

  const downloadedDemoDetails = await getDownloadedDemoDetailsAsync(demosToDownload);
  return cachedDemoDetails.concat(downloadedDemoDetails);
}

function getMapRunMessages(content: DemoContent) {
  return content.chat
    .map((m) => {
      const groups = mapRunMessageRegExp.exec(m.text)?.slice(1);
      if (!groups) {
        return null;
      }

      return {
        ...m,
        tempusClass: groups[0],
        userName: groups[1],
        time: groups[2],
      };
    })
    .filter((m) => !!m);
}

function getMapRunsFromDemoDetails(demoDetails: DemoDetails[]): MapRun[] {
  return demoDetails
    .map((d) =>
      d.mapRunMessages.map((m) => {
        const type = tempusClassToType[m.tempusClass];
        const timeParts = m.time.split(":");
        let seconds = 0;
        if (timeParts.length === 3) {
          seconds =
            parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseFloat(timeParts[2]);
        } else {
          seconds = parseInt(timeParts[0]) * 60 + parseFloat(timeParts[1]);
        }

        return {
          type,
          seconds,
          steam64Id: convertToSteam64Id(d.users.get(m.userName)!)!,
          timestamp: new Date(d.start.getTime() + m.tick * d.msPerTick),
        };
      }),
    )
    .flat();
}

async function getDownloadedDemoDetailsAsync(demos: TempusDemo[]): Promise<DemoDetails[]> {
  const demoStarts = new Map<string, Date>(demos.map((d) => [d.fileName, d.start]));
  const demoZips = await Promise.all(demos.map(async (d) => await unzip(d.url!)));
  return await Promise.all(
    demoZips.map(async (z) => {
      const files = Object.entries(z.entries);
      const [fileName, entry] = files[0];
      const buffer = await entry.arrayBuffer();
      const content = JSON.parse(parseDemo(new Uint8Array(buffer), false)) as DemoContent;
      const users = new Map<string, string>(
        Object.values(content.users).map((u) => [u.name, u.steamId]),
      );

      return {
        fileName,
        users,
        mapRunMessages: getMapRunMessages(content),
        start: demoStarts.get(fileName)!,
        msPerTick: content.intervalPerTick * 1000,
      };
    }),
  );
}
