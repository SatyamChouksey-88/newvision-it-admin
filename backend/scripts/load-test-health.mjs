/**
 * Local smoke load test (Phase 10). Requires API on PORT (default 3000).
 * Usage: node scripts/load-test-health.mjs
 */
const base = process.env.LOAD_TEST_URL || 'http://localhost:3000/api/health';
const n = Number(process.env.LOAD_TEST_REQUESTS ?? 500);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY ?? 20);

async function one() {
  const t0 = performance.now();
  const res = await fetch(base);
  const ms = performance.now() - t0;
  return { ok: res.ok, ms };
}

async function run() {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < n) {
      i += 1;
      results.push(await one());
    }
  }
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalMs = performance.now() - t0;
  const ok = results.filter((r) => r.ok).length;
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const p95 = lat[Math.floor(lat.length * 0.95)] ?? 0;
  console.log(
    JSON.stringify({
      url: base,
      requests: n,
      concurrency,
      ok,
      failed: n - ok,
      totalMs: Math.round(totalMs),
      rps: Math.round((n / totalMs) * 1000),
      p95Ms: Math.round(p95),
    }),
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
