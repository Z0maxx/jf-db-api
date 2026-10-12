import { BaseEntity, Collection, type Ref, defineEntity, p } from "@mikro-orm/core";

import { TournamentEvent } from "./TournamentEvent";
import { TournamentLeaderboardItem } from "./TournamentLeaderboardItem";

export class TournamentMap extends BaseEntity {
  id!: number;
  name!: string;
  event!: Ref<TournamentEvent>;
  tournamentLeaderboardItemCollection = new Collection<TournamentLeaderboardItem>(this);
}

export const TournamentMapSchema = defineEntity({
  class: TournamentMap,
  uniques: [{ name: "unq_tournament_map", properties: ["event", "name"] }],
  checks: [{ name: "chk_tournament_map_name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(100),
    event: () =>
      p
        .manyToOne(TournamentEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("cascade")
        .index("idx_tournament_map"),
    tournamentLeaderboardItemCollection: () =>
      p.oneToMany(TournamentLeaderboardItem).mappedBy("map"),
  },
});
