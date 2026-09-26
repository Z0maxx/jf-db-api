import { LeaderboardQuery } from "./types";

export function getLeaderboardFilter(
  query: LeaderboardQuery,
  orderBy: { [property: string]: "ASC" | "DESC" },
) {
  query.pageSize = Math.min(query.pageSize, 100);
  return {
    query: { map: query.mapId, participant: { resigned: false } },
    options: {
      populate: ["participant.user.steam64Id"],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      orderBy,
    },
  } as const;
}
