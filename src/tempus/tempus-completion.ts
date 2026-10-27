import { fetchTempusApiAsync } from "./tempus-fetch";
import { TempusCompletionQuery } from "./tempus.types";

type CompletionResponse = {
  result: {
    duration: number;
    date: number;
  } | null;
};

export async function getCompletionAsync(query: TempusCompletionQuery) {
  const response = await fetchTempusApiAsync(
    `/maps/name/${query.mapName}/zones/typeindex/map/1/records/player/${query.tempusId}/${query.type === "soldier" ? 3 : 4}`,
  );
  const result = ((await response.json()) as CompletionResponse).result;
  if (!result) {
    return null;
  }

  return {
    prSeconds: result.duration,
    prTimestamp: new Date(result.date * 1000),
  };
}
