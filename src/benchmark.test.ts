import assert from "node:assert/strict";
import http from "node:http";
import { describe, it } from "node:test";
import { readBodyByteLength, runBenchmark, summarize } from "./benchmark.ts";

const MIB = 1024 * 1024;

describe("summarize", () => {
  it("averages request time and divides total bytes by total time", () => {
    const summary = summarize([
      { durationMs: 1000, bytes: MIB },
      { durationMs: 3000, bytes: 3 * MIB },
    ]);

    assert.equal(summary.count, 2);
    assert.equal(summary.averageMs, 2000);
    assert.equal(summary.totalBytes, 4 * MIB);
    assert.equal(summary.totalMs, 4000);
    assert.equal(summary.speedMibPerSec, 1);
  });

  it("reports zero speed when the measured time is zero", () => {
    const summary = summarize([{ durationMs: 0, bytes: MIB }]);
    assert.equal(summary.speedMibPerSec, 0);
    assert.equal(summary.totalBytes, MIB);
  });

  it("rejects an empty series", () => {
    assert.throws(() => summarize([]), /No samples/);
  });
});

describe("runBenchmark", () => {
  it("pauses between requests and keeps the pause out of the measured time", async () => {
    const body = Buffer.alloc(100);
    const starts: number[] = [];
    const server = http.createServer((_req, res) => {
      starts.push(Date.now());
      res.end(body);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Test server did not bind to a port");
    }

    try {
      const samples = await runBenchmark(
        `http://127.0.0.1:${address.port}/payload`,
        3,
        80,
      );

      assert.equal(samples.length, 3);
      assert.ok(starts[1]! - starts[0]! >= 70);
      assert.ok(starts[2]! - starts[1]! >= 70);
      for (const sample of samples) {
        assert.equal(sample.bytes, 100);
        assert.ok(sample.durationMs < 70);
      }
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  });
});

describe("readBodyByteLength", () => {
  it("counts every byte of the response body", async () => {
    const response = new Response(new Uint8Array([1, 2, 3, 4, 5]));
    assert.equal(await readBodyByteLength(response), 5);
  });

  it("returns zero for an empty body", async () => {
    const response = new Response(new Uint8Array());
    assert.equal(await readBodyByteLength(response), 0);
  });
});
