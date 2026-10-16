import { TempusIsDownError } from "./tempus.errors";
import { TempusCompletionQuery } from "./tempus.types";

type CompletionResponse = {
  result: {
    duration: number;
    date: number;
  } | null;
};

export async function getCompletionAsync(query: TempusCompletionQuery) {
  try {
    const response = await fetch(
      `https://tempus2.xyz/api/v0/maps/name/${query.mapName}/zones/typeindex/map/1/records/player/${query.tempusId}/${query.type === "soldier" ? 3 : 4}`,
      {
        signal: AbortSignal.timeout(5000),
      },
    );

    const result = ((await response.json()) as CompletionResponse).result;
    if (!result) {
      return null;
    }

    return {
      prSeconds: result.duration,
      prTimestamp: new Date(result.date),
    };
  } catch {
    throw new TempusIsDownError();
  }
}
