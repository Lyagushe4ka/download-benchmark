export const REQUEST_COUNT = 10;
export const REQUEST_TIMEOUT_MS = 60_000;
export const DELAY_BETWEEN_REQUESTS_MS = 1_000;

const KIB = 1024;
const MIB = 1024 * 1024;

export type Sample = {
  durationMs: number;
  bytes: number;
};

export type Summary = {
  count: number;
  averageMs: number;
  totalBytes: number;
  totalMs: number;
  speedMibPerSec: number;
  speedKibPerSec: number;
};

export type SuccessEvent = {
  index: number;
  count: number;
  sample: Sample;
};

export function summarize(samples: readonly Sample[]): Summary {
  if (samples.length === 0) {
    throw new Error("No samples to summarize");
  }

  let totalMs = 0;
  let totalBytes = 0;
  for (const sample of samples) {
    totalMs += sample.durationMs;
    totalBytes += sample.bytes;
  }

  const totalSeconds = totalMs / 1000;
  const speedMibPerSec = totalSeconds === 0 ? 0 : totalBytes / MIB / totalSeconds;
  const speedKibPerSec = totalSeconds === 0 ? 0 : totalBytes / KIB / totalSeconds;

  return {
    count: samples.length,
    averageMs: totalMs / samples.length,
    totalBytes,
    totalMs,
    speedMibPerSec,
    speedKibPerSec,
  };
}

export async function readBodyByteLength(response: Response): Promise<number> {
  const body = response.body;
  if (body === null) {
    return 0;
  }

  const reader = body.getReader();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      return bytes;
    }
    if (value !== undefined) {
      bytes += value.byteLength;
    }
  }
}

export async function measureOnce(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Sample> {
  const started = performance.now();
  const response = await fetch(url, {
    headers: { "Accept-Encoding": "identity" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const bytes = await readBodyByteLength(response);
  return {
    durationMs: performance.now() - started,
    bytes,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runBenchmark(
  url: string,
  count = REQUEST_COUNT,
  delayMs = DELAY_BETWEEN_REQUESTS_MS,
  onSuccess?: (event: SuccessEvent) => void,
): Promise<Sample[]> {
  const samples: Sample[] = [];

  for (let index = 0; index < count; index += 1) {
    try {
      const sample = await measureOnce(url);
      samples.push(sample);
      onSuccess?.({ index: index + 1, count, sample });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`request ${index + 1}/${count} failed: ${message}`);
    }

    if (index < count - 1) {
      await sleep(delayMs);
    }
  }

  return samples;
}
