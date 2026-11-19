import {
  DELAY_BETWEEN_REQUESTS_MS,
  REQUEST_COUNT,
  runBenchmark,
  summarize,
  type SuccessEvent,
  type Summary,
} from "./benchmark.ts";

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

function formatSpeeds(summary: Summary): string {
  return `${summary.speedMibPerSec.toFixed(2)} MiB/s, ${summary.speedKibPerSec.toFixed(2)} KiB/s`;
}

function logSuccess(event: SuccessEvent): void {
  const speed = summarize([event.sample]);
  const seconds = (event.sample.durationMs / 1000).toFixed(2);
  console.log(
    `${event.index}/${event.count} ok ${event.sample.bytes} bytes ${seconds}s ${formatSpeeds(speed)}`,
  );
}

async function main(): Promise<void> {
  const url = parseUrl(process.argv[2]);
  const samples = await runBenchmark(
    url.href,
    REQUEST_COUNT,
    DELAY_BETWEEN_REQUESTS_MS,
    logSuccess,
  );
  const summary = summarize(samples);
  console.log(formatSpeeds(summary));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
