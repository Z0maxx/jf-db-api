import { fetchTempusApiAsync } from "./tempus-fetch";
import { TempusServer } from "./tempus.types";

type StatusListResponse = {
  server_info: {
    id: number;
    name: string;
  };
};

export async function getServersAsync(): Promise<TempusServer[]> {
  const response = await fetchTempusApiAsync("/servers/statusList");
  const result = (await response.json()) as StatusListResponse[];
  const servers = result.map((r) => r.server_info);
  return servers.map(({ id, name }) => ({ id, name }));
}
