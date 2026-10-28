import { ctx } from "#/db-context";
import { seedEntitiesAsync } from "#/default-entities";
import { MikroORM } from "@mikro-orm/core";
import { SqliteDriver, NodeSqliteDialect } from "@mikro-orm/mariadb";
import path from "path";
import { vi } from "vitest";

export type WorkerMock = ReturnType<typeof createWorkerMock>;

export async function setupInMemoryDbAsync(rootDir: string) {
  ctx.orm = await MikroORM.init({
      driver: SqliteDriver,
      driverOptions: new NodeSqliteDialect(":memory:"),
      dbName: ":memory:",
      entities: [path.join(rootDir, "dist", "db-entities", "*.js")],
      entitiesTs: [path.join(rootDir, "src", "db-entities", "*.ts")],
    });

    for (const meta of ctx.orm.getMetadata().getAll().values()) {
      meta.checks = [];
    }

    await ctx.orm.schema.refresh();
    await seedEntitiesAsync();
}

export function mockWorkers(workerPaths: string[]) {
  const workerMocks = Object.fromEntries(
    workerPaths.map((path) => [path, createWorkerMock()]),
  ) as Record<string, WorkerMock>;

  vi.doMock("node:worker_threads", () => ({
    parentPort: null,
    Worker: class {
      workerMock: WorkerMock;
      constructor(workerPath: string) {
        this.workerMock = workerMocks[workerPath]!;
      }

      on(event: string, listener: (value: any) => void) {
        this.workerMock.on(event, listener);
        console.log(this.workerMock.listeners);
        return this;
      }

      postMessage(message: unknown) {
        this.workerMock.postMessage(message);
      }
    },
  }));

  return workerMocks;
}

function createWorkerMock() {
  const listeners: Array<(value: any) => void> = [];
  return {
    listeners,
    on: (event: string, listener: (value: any) => void) => {
      if (event === "message") {
        listeners.push(listener);
      }
    },
    postMessage: vi.fn(),
  };
}
