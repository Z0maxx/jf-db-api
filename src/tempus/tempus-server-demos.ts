import { fetchTempusApiAsync } from "./tempus-fetch";
import { TempusDemo } from "./tempus.types";

type Demo = {
  mapname: string;
  date: number;
  url: string | null;
  filename: string;
};

export async function getServerDemosAsync(serverId: number): Promise<TempusDemo[]> {
  const response = await fetchTempusApiAsync(`/servers/${serverId}/demos`);
  const result = (await response.json()) as Demo[];
  return result.map((d) => ({
    mapName: d.mapname,
    start: new Date(d.date * 1000),
    url: d.url,
    fileName: d.filename + ".dem",
  }));
}
