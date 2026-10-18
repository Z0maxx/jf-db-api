const tempusApiTimeout = 1100;
const maxTimeout = 60 * 30 * 1000

type TempusQueueItem = {
  endpoint: string;
  resolve(response: Response): void;
};

let loop: NodeJS.Timeout | undefined;
const queue: TempusQueueItem[] = [];

export function fetchTempusApiAsync(endpoint: string) {
  return new Promise<Response>((resolve) => {
    queue.push({
      resolve,
      endpoint,
    });
    if (!loop) {
      processQueue();
    }
  });
}

function processQueue() {
  let timeout = tempusApiTimeout;
  loop = setInterval(async () => {
    const item = queue[0];
    if (!item) {
      clearInterval(loop);
      loop = undefined;
      return;
    }

    try {
      const res = await fetch(item.endpoint, {
        signal: AbortSignal.timeout(5000),
      });

      if (res.status === 429) {
        timeout = parseInt(res.headers.get("Retry-After")!) * 1000 + 100;
        return;
      }

      item.resolve(res);
      queue.shift();
    } catch {
      timeout = Math.min(timeout * 2, maxTimeout)
    }
  }, timeout);
}
