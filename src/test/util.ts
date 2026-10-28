import { vi } from "vitest";

export type WorkerMock = ReturnType<typeof createWorkerMock>;

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
