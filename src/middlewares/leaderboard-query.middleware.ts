import { LeaderboardQuerySchema } from "#/schemas";

import { querySchema } from "./query-schema.middleware";

export const leaderboardQuery = querySchema(LeaderboardQuerySchema);
