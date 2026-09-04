import { LeaderboardQuery } from "./types";

export function getLeaderboardFilter(query: LeaderboardQuery) {
  query.pageSize = Math.min(query.pageSize, 100);
  return {
    query: { map: query.mapId },
    options: {
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      orderBy: { prSeconds: query.order ?? "ASC" },
    },
  };
}
