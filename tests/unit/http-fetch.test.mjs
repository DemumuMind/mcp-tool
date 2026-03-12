import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { fetchWithRetry } from "../../scripts/lib/http.mjs";

let server;
let baseUrl;
let attempts;

function startServer(handler) {
  return new Promise((resolve) => {
    server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

beforeEach(() => {
  attempts = 0;
});

afterEach(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
  baseUrl = null;
});

describe("fetchWithRetry", () => {
  it("retries retryable HTTP statuses and eventually succeeds", async () => {
    await startServer((req, res) => {
      attempts++;
      if (attempts === 1) {
        res.statusCode = 503;
        res.end("retry");
        return;
      }
      res.statusCode = 200;
      res.end("ok");
    });

    const response = await fetchWithRetry(`${baseUrl}/health`, {
      retries: 2,
      retryDelayMs: 1,
      timeoutMs: 200,
    });

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.equal(attempts, 2);
  });

  it("does not retry non-retryable HTTP statuses", async () => {
    await startServer((req, res) => {
      attempts++;
      res.statusCode = 404;
      res.end("missing");
    });

    const response = await fetchWithRetry(`${baseUrl}/missing`, {
      retries: 2,
      retryDelayMs: 1,
      timeoutMs: 200,
    });

    assert.equal(response.status, 404);
    assert.equal(await response.text(), "missing");
    assert.equal(attempts, 1);
  });

  it("cancels response body before retrying a retryable status", async () => {
    let cancelCalled = false;

    let call = 0;
    async function mockFetch() {
      call++;
      if (call === 1) {
        return {
          status: 503,
          body: { cancel: async () => { cancelCalled = true; } },
        };
      }
      return { status: 200, text: async () => "ok" };
    }

    const response = await fetchWithRetry("http://fake", {
      retries: 2,
      retryDelayMs: 1,
      timeoutMs: 5000,
      fetchImpl: mockFetch,
    });

    assert.equal(response.status, 200);
    assert.equal(cancelCalled, true, "response.body.cancel() should be called before retry");
    assert.equal(call, 2);
  });

  it("tolerates missing response.body when retrying", async () => {
    let call = 0;
    async function mockFetch() {
      call++;
      if (call === 1) {
        return { status: 502, body: null };
      }
      return { status: 200, text: async () => "recovered" };
    }

    const response = await fetchWithRetry("http://fake", {
      retries: 2,
      retryDelayMs: 1,
      timeoutMs: 5000,
      fetchImpl: mockFetch,
    });

    assert.equal(response.status, 200);
    assert.equal(call, 2);
  });

  it("surfaces response body cleanup failures instead of retrying as transport errors", async () => {
    let call = 0;
    const cleanupError = new Error("stream cleanup failed");

    async function mockFetch() {
      call++;
      if (call === 1) {
        return {
          status: 503,
          body: {
            cancel: async () => {
              throw cleanupError;
            },
          },
        };
      }
      return { status: 200, text: async () => "unexpected" };
    }

    await assert.rejects(
      () =>
        fetchWithRetry("http://fake", {
          retries: 2,
          retryDelayMs: 1,
          timeoutMs: 5000,
          fetchImpl: mockFetch,
        }),
      cleanupError,
    );
    assert.equal(call, 1);
  });

  it("surfaces cleanup failures from a real Response stream without retrying", async () => {
    let call = 0;
    const cleanupError = new Error("real stream cleanup failed");

    async function mockFetch() {
      call++;
      if (call > 1) {
        return new Response("unexpected retry", { status: 200 });
      }

      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("retry"));
        },
        cancel() {
          throw cleanupError;
        },
      });

      return new Response(body, { status: 503 });
    }

    await assert.rejects(
      () =>
        fetchWithRetry("http://fake", {
          retries: 2,
          retryDelayMs: 1,
          timeoutMs: 5000,
          fetchImpl: mockFetch,
        }),
      cleanupError,
    );
    assert.equal(call, 1);
  });

  it("times out a slow request and retries the next attempt", async () => {
    await startServer((req, res) => {
      attempts++;
      if (attempts === 1) {
        setTimeout(() => {
          if (!res.writableEnded) {
            res.statusCode = 200;
            res.end("too-late");
          }
        }, 100);
        return;
      }

      res.statusCode = 200;
      res.end("recovered");
    });

    const response = await fetchWithRetry(`${baseUrl}/slow`, {
      retries: 2,
      retryDelayMs: 1,
      timeoutMs: 20,
    });

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "recovered");
    assert.equal(attempts, 2);
  });
});
