import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBodyByteLength, summarize } from "./benchmark.ts";

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
