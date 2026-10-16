import { ctx } from "#/db-context";
import { AllOutEvent } from "#/db-entities/AllOutEvent";
import { AllOutStage1Map } from "#/db-entities/AllOutStage1Map";
import { AllOutStage2Map } from "#/db-entities/AllOutStage2Map";
import { AllOutStage3Map } from "#/db-entities/AllOutStage3Map";
import { MonthlyEvent } from "#/db-entities/MonthlyEvent";
import { MonthlyMap } from "#/db-entities/MonthlyMap";
import { CreateDivisionMapDto } from "#/types";
import {
  EntityData,
  FromEntityType,
  Loaded,
  RequiredEntityData,
  FilterQuery,
  wrap,
} from "@mikro-orm/core";
import { SqlEntityRepository } from "@mikro-orm/sql";

export async function setDivisionMapsAsync<
  TCreateMap extends CreateDivisionMapDto,
  TDbMap extends AllOutStage1Map | AllOutStage2Map | AllOutStage3Map | MonthlyMap,
>(
  repository: SqlEntityRepository<TDbMap>,
  event: AllOutEvent | MonthlyEvent,
  maps: TCreateMap[],
  assignTransformFn: (map: TCreateMap) => EntityData<FromEntityType<Loaded<TDbMap>>>,
  createTranformFn: (map: TCreateMap) => RequiredEntityData<TDbMap>,
) {
  const mapsMap = new Map<string, TCreateMap>(maps.map((m) => [`${m.name}|${m.divisionId}`, m]));
  const existing = await repository.find({ event } as FilterQuery<TDbMap>);
  const deleted = existing.filter((e) => !mapsMap.get(`${e.name}|${e.division.id}`));
  deleted.forEach((r) => ctx.em.remove(r));
  const updated = existing.filter((e) => !deleted.includes(e));
  updated.forEach((u) => {
    const key = `${u.name}|${u.division.id}`;
    wrap(u).assign(assignTransformFn(mapsMap.get(key)!));
    mapsMap.delete(key);
  });

  mapsMap.values().forEach((m) => repository.create(createTranformFn(m)));
}
