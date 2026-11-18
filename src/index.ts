import { REQUEST_COUNT, runBenchmark, summarize } from "./benchmark.ts";

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

async function main(): Promise<void> {
  const url = parseUrl(process.argv[2]);
  const samples = await runBenchmark(url.href, REQUEST_COUNT);
  const summary = summarize(samples);
  console.log(`${summary.speedMibPerSec.toFixed(2)} MiB/s`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
