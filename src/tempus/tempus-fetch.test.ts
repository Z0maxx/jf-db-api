import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

const maxTimeout = 60 * 30 * 1000;

async function loadFetch() {
  vi.resetModules();
  const mod = await import("./tempus-fetch.js");
  return mod.fetchTempusApiAsync;
}

describe("fetchTempusApiAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends one request at a time and resolves each caller with its own response", async () => {
    const fetchTempusApiAsync = await loadFetch();
    let releaseFirst: ((response: Response) => void) | undefined;
    const firstResponse = new Response("first", { status: 200 });
    const secondResponse = new Response("second", { status: 200 });
    const fetchMock = vi.fn((input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/a")) {
        return new Promise<Response>((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve(secondResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchTempusApiAsync("https://tempus2.xyz/a");
    const second = fetchTempusApiAsync("https://tempus2.xyz/b");

    await vi.advanceTimersByTimeAsync(1099);
    assert.equal(fetchMock.mock.calls.length, 0);

    await vi.advanceTimersByTimeAsync(1);
    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(String(fetchMock.mock.calls[0]?.[0]), "https://tempus2.xyz/a");

    await vi.advanceTimersByTimeAsync(10_000);
    assert.equal(fetchMock.mock.calls.length, 1);

    assert.ok(releaseFirst);
    releaseFirst(firstResponse);
    await vi.advanceTimersByTimeAsync(1100);

    assert.equal(await first, firstResponse);
    assert.equal(await second, secondResponse);
    assert.equal(fetchMock.mock.calls.length, 2);
    assert.equal(String(fetchMock.mock.calls[1]?.[0]), "https://tempus2.xyz/b");
  });

  it("waits for Retry-After plus a cushion before retrying the same caller", async () => {
    const fetchTempusApiAsync = await loadFetch();
    const limited = new Response(null, {
      status: 429,
      headers: { "Retry-After": "2" },
    });
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchTempusApiAsync("https://tempus2.xyz/a");
    await vi.advanceTimersByTimeAsync(1100);
    assert.equal(fetchMock.mock.calls.length, 1);

    await vi.advanceTimersByTimeAsync(2099);
    assert.equal(fetchMock.mock.calls.length, 1);

    await vi.advanceTimersByTimeAsync(1);
    assert.equal(fetchMock.mock.calls.length, 2);
    assert.equal(await pending, ok);
  });

  it("caps Retry-After delays at the existing maximum", async () => {
    const fetchTempusApiAsync = await loadFetch();
    const limited = new Response(null, {
      status: 429,
      headers: { "Retry-After": "999999" },
    });
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchTempusApiAsync("https://tempus2.xyz/a");
    await vi.advanceTimersByTimeAsync(1100);
    assert.equal(fetchMock.mock.calls.length, 1);

    await vi.advanceTimersByTimeAsync(maxTimeout - 1);
    assert.equal(fetchMock.mock.calls.length, 1);

    await vi.advanceTimersByTimeAsync(1);
    assert.equal(fetchMock.mock.calls.length, 2);
    assert.equal(await pending, ok);
  });

  it("backs off exponentially from 1100ms after transient failures", async () => {
    const fetchTempusApiAsync = await loadFetch();
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchTempusApiAsync("https://tempus2.xyz/a");

    await vi.advanceTimersByTimeAsync(1100);
    assert.equal(fetchMock.mock.calls.length, 1);

    await vi.advanceTimersByTimeAsync(2199);
    assert.equal(fetchMock.mock.calls.length, 1);
    await vi.advanceTimersByTimeAsync(1);
    assert.equal(fetchMock.mock.calls.length, 2);

    await vi.advanceTimersByTimeAsync(4399);
    assert.equal(fetchMock.mock.calls.length, 2);
    await vi.advanceTimersByTimeAsync(1);
    assert.equal(fetchMock.mock.calls.length, 3);
    assert.equal(await pending, ok);
  });

  it("rejects a caller after repeated failures and continues the queue", async () => {
    const fetchTempusApiAsync = await loadFetch();
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchTempusApiAsync("https://tempus2.xyz/a");
    const second = fetchTempusApiAsync("https://tempus2.xyz/b");
    const firstResult = first.then(
      () => "resolved" as const,
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(1100 + 2200 + 4400 + 8800 + 17600);
    const failure = await firstResult;
    assert.ok(failure instanceof Error);
    assert.equal(failure.message, "network");

    await vi.advanceTimersByTimeAsync(1100);
    assert.equal(await second, ok);
    assert.equal(String(fetchMock.mock.calls[5]?.[0]), "https://tempus2.xyz/b");
  });

  it("rejects after repeated 429 responses and continues the queue", async () => {
    const fetchTempusApiAsync = await loadFetch();
    const limited = new Response(null, {
      status: 429,
      headers: { "Retry-After": "1" },
    });
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(limited)
      .mockResolvedValueOnce(limited)
      .mockResolvedValueOnce(limited)
      .mockResolvedValueOnce(limited)
      .mockResolvedValueOnce(limited)
      .mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchTempusApiAsync("https://tempus2.xyz/a");
    const second = fetchTempusApiAsync("https://tempus2.xyz/b");
    const firstResult = first.then(
      () => "resolved" as const,
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(1100 + 4 * 1100);
    const failure = await firstResult;
    assert.ok(failure instanceof Error);
    assert.match(failure.message, /rate limit/i);

    await vi.advanceTimersByTimeAsync(1100);
    assert.equal(await second, ok);
    assert.equal(String(fetchMock.mock.calls[5]?.[0]), "https://tempus2.xyz/b");
  });
});
