import { defineConfig, UnderscoreNamingStrategy } from "@mikro-orm/mysql";
import { EntityGenerator } from "@mikro-orm/entity-generator";

export class JfNamingStrategy extends UnderscoreNamingStrategy {
  override getEntityName(tableName: string, schemaName?: string): string {
    const original = super.getEntityName(tableName, schemaName);
    if (super.getEntityName(tableName, schemaName).endsWith("Leaderboard")) {
      return original + "Item";
    }

    return original;
  }
}

export default defineConfig({
  multipleStatements: true,
  extensions: [EntityGenerator],
  namingStrategy: JfNamingStrategy,
  discovery: {
    warnWhenNoEntities: false,
  },
  entities: ["dist/db-entities/*.js"],
  entitiesTs: ["src/db-entities/*.ts"],
  host: "localhost",
  user: "root",
  dbName: "jumpfortress",
  debug: Boolean(parseInt(process.env.MIKRO_DEBUG ?? "0")),
  entityGenerator: {
    save: true,
    path: "src/db-entities",
    forceUndefined: true,
    undefinedDefaults: false,
    esmImport: false,
    readOnlyPivotTables: true,
    outputPurePivotTables: true,
    bidirectionalRelations: true,
    useCoreBaseEntity: true,
  },
});
