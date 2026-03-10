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
