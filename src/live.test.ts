import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { measureOnce, summarize } from "./benchmark.ts";

const IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";
const GOOGLE_URL = "https://www.google.com/";

async function assertLiveDownload(url: string): Promise<void> {
  const sample = await measureOnce(url);
  assert.ok(sample.bytes > 1000, `${url} returned ${sample.bytes} bytes`);
  assert.ok(sample.durationMs > 0);

  const summary = summarize([sample]);
  assert.equal(summary.totalBytes, sample.bytes);
  assert.ok(Number.isFinite(summary.speedMibPerSec));
  assert.ok(summary.speedMibPerSec > 0);
  assert.ok(Number.isFinite(summary.speedKibPerSec));
  assert.ok(summary.speedKibPerSec > summary.speedMibPerSec);
}

describe("live pages", () => {
  it("downloads a public image", { timeout: 60_000 }, async () => {
    await assertLiveDownload(IMAGE_URL);
  });

  it("downloads the Google homepage", { timeout: 60_000 }, async () => {
    await assertLiveDownload(GOOGLE_URL);
  });
});
