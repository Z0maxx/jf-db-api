import { LeaderboardQuery } from "./types";

export function getLeaderboardFilter(
  query: LeaderboardQuery,
  orderBy: { [property: string]: "ASC" | "DESC" },
) {
  query.pageSize = Math.min(query.pageSize, 100);
  return {
    query: { map: query.mapId },
    options: {
      populate: ["participant.user.steamId64"],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      orderBy,
    },
  } as const;
}
