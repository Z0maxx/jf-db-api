import { BaseEntity, Collection } from "@mikro-orm/core";
import { TDivisionType } from "./db-entities/Division";

export function getDivisionMaps<
  TMap,
  TDbMap extends { division: { getEntity: () => { type: string } } } & BaseEntity,
>(maps: Collection<TDbMap>, mapFn: (map: TDbMap) => TMap) {
  const groups = Object.groupBy(maps, ({ division }) => division.getEntity().type);
  return Object.entries(groups)
    .map(([key, maps]) => ({ [key]: maps!.map(mapFn) }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {}) as { [K in TDivisionType]: TMap[] };
}
