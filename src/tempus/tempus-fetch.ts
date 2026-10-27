const tempusApiTimeout = 1100;
const maxTimeout = 60 * 30 * 1000;
const maxAttempts = 5;
const maxRateLimitAttempts = 5;

type TempusQueueItem = {
  endpoint: string;
  attempts: number;
  rateLimitAttempts: number;
  resolve(response: Response): void;
  reject(reason: unknown): void;
};

const queue: TempusQueueItem[] = [];
let processing = false;

export function fetchTempusApiAsync(endpoint: string): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    queue.push({
      endpoint,
      attempts: 0,
      rateLimitAttempts: 0,
      resolve,
      reject,
    });
    if (!processing) {
      processing = true;
      void processQueue();
    }
  });
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryAfterDelay(response: Response) {
  const header = response.headers.get("Retry-After");
  const seconds = header === null ? Number.NaN : parseInt(header, 10);
  const delay = Number.isFinite(seconds) ? seconds * 1000 + 100 : tempusApiTimeout;
  return Math.min(Math.max(delay, 0), maxTimeout);
}

function retire(item: TempusQueueItem) {
  const index = queue.indexOf(item);
  if (index !== -1) {
    queue.splice(index, 1);
  }
}

async function processQueue() {
  let nextDelay = tempusApiTimeout;
  let failureDelay = tempusApiTimeout;

  try {
    while (queue.length > 0) {
      const item = queue[0]!;

      await sleep(nextDelay);
      if (!queue.includes(item)) {
        nextDelay = tempusApiTimeout;
        failureDelay = tempusApiTimeout;
        continue;
      }

      try {
        const res = await fetch("https://tempus2.xyz/api/v0" + item.endpoint, {
          signal: AbortSignal.timeout(5000),
        });

        if (res.status === 429) {
          item.rateLimitAttempts += 1;
          if (item.rateLimitAttempts >= maxRateLimitAttempts) {
            retire(item);
            item.reject(new Error("Tempus API rate limit retries exhausted"));
            nextDelay = tempusApiTimeout;
            failureDelay = tempusApiTimeout;
            continue;
          }

          nextDelay = retryAfterDelay(res);
          continue;
        }

        retire(item);
        item.resolve(res);
        nextDelay = tempusApiTimeout;
        failureDelay = tempusApiTimeout;
      } catch (error) {
        item.attempts += 1;
        if (item.attempts >= maxAttempts) {
          retire(item);
          item.reject(error);
          nextDelay = tempusApiTimeout;
          failureDelay = tempusApiTimeout;
          continue;
        }

        failureDelay = Math.min(failureDelay * 2, maxTimeout);
        nextDelay = failureDelay;
      }
    }
  } finally {
    processing = false;
    if (queue.length > 0) {
      processing = true;
      void processQueue();
    }
  }
}
