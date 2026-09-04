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
  checks: [{ name: "name", expression: "char_length(`name`) > 0" }],
  properties: {
    id: p.integer().primary(),
    name: p.string().length(50),
    event: () =>
      p
        .manyToOne(TournamentEvent)
        .ref()
        .updateRule("restrict")
        .deleteRule("restrict")
        .index("idx_tournament_map"),
    tournamentLeaderboardItemCollection: () =>
      p.oneToMany(TournamentLeaderboardItem).mappedBy("map"),
  },
});
