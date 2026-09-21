import { defineConfig, ReferenceKind, UnderscoreNamingStrategy } from "@mikro-orm/mysql";
import { EntityGenerator } from "@mikro-orm/entity-generator";

export class JfNamingStrategy extends UnderscoreNamingStrategy {
  override getEntityName(tableName: string, schemaName?: string): string {
    const original = super.getEntityName(tableName, schemaName);
    if (super.getEntityName(tableName, schemaName).endsWith("Leaderboard")) {
      return original + "Item";
    }

    return original;
  }

  override manyToManyPropertyName(_: string, targetEntityName: string): string {
    return targetEntityName.charAt(0).toLowerCase() + targetEntityName.slice(1) + "Collection";
  }

  override inverseSideName(entityName: string, propertyName: string, kind: ReferenceKind): string {
    if (kind === ReferenceKind.MANY_TO_MANY || kind === ReferenceKind.ONE_TO_MANY) {
      const baseName = entityName.charAt(0).toLowerCase() + entityName.slice(1);
      return baseName + "Collection";
    }

    return super.inverseSideName(entityName, propertyName, kind);
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
    outputPurePivotTables: false,
    bidirectionalRelations: true,
    useCoreBaseEntity: true,
  },
});
