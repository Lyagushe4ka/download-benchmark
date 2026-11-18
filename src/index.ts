import { REQUEST_COUNT, runBenchmark, summarize } from "./benchmark.ts";

const MIB = 1024 * 1024;

function usage(): never {
  console.error("Usage: npm start -- <http(s)-url>");
  process.exit(1);
}

function parseUrl(raw: string | undefined): URL {
  if (raw === undefined || raw.trim() === "") {
    usage();
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.error(`Invalid URL: ${raw}`);
    usage();
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    console.error(`URL must use http or https: ${raw}`);
    process.exit(1);
  }

  return url;
}

function formatMib(bytes: number): string {
  return (bytes / MIB).toFixed(2);
}

function formatMs(ms: number): string {
  return ms.toFixed(1);
}

async function main(): Promise<void> {
  const url = parseUrl(process.argv[2]);

  console.log(`url: ${url.href}`);
  console.log(`requests: ${REQUEST_COUNT} (sequential)`);

  const samples = await runBenchmark(url.href, REQUEST_COUNT, (index, sample) => {
    const number = String(index + 1).padStart(2, " ");
    console.log(
      `${number}  ${formatMs(sample.durationMs)} ms  ${formatMib(sample.bytes)} MiB`,
    );
  });

  const summary = summarize(samples);
  console.log(`average time: ${formatMs(summary.averageMs)} ms`);
  console.log(
    `total downloaded: ${formatMib(summary.totalBytes)} MiB (${summary.totalBytes} bytes)`,
  );
  console.log(`download speed: ${summary.speedMibPerSec.toFixed(2)} MiB/s`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
